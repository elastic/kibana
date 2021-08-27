/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const Path = require('path');
const { Project } = require('ts-morph');
const { CLIEngine } = require('eslint');

const createTimer = () => {
  let start = process.hrtime.bigint();
  return {
    measure: (event) => {
      const next = process.hrtime.bigint();

      // console.log(`${event}: ${Number(Number(next - start) / 1000).toPrecision(4)}us`);

      start = next;
    },
  };
};

const timer = createTimer();

const project = new Project({
  tsConfigFilePath: Path.resolve('./tsconfig.json'),
});

timer.measure('createProject');

let dirsAlreadyProcessed = [
  'src/core',
  'src/plugins/field_formats',
];

let dirsToProcess = [
  './'
];

dirsToProcess = dirsToProcess.map((path) => Path.resolve(__dirname, path));
dirsAlreadyProcessed = dirsAlreadyProcessed.map((path) => Path.resolve(__dirname, path));

const allFilesInProject = project
  .getSourceFiles()
  .map((file) => file.getFilePath())
  .sort();

timer.measure('gotSourceFiles');

console.log(`${allFilesInProject.length} files in project`);

const allFilesToProcess = allFilesInProject.filter((file) => {
  return dirsAlreadyProcessed.every((dir) => !file.startsWith(dir));
});

console.log(allFilesToProcess);

const filesToProcessNow = allFilesInProject.filter((file) => {
  return allFilesToProcess.includes(file) && dirsToProcess.some((dir) => file.startsWith(dir));
});

console.log(filesToProcessNow);

timer.measure('start processing');

const engine = new CLIEngine({
  fix: true,
  extensions: ['.ts', '.tsx'],
  rules: {
    '@kbn/eslint/no-restricted-paths': 0,
  },
});

const promise = filesToProcessNow.reduce(async (prev, file, index) => {
  try {
    await prev;
  } catch (err) {
    console.log(err);
  }

  const localTimer = createTimer();

  const sourceFile = project.getSourceFile(file);

  localTimer.measure('getSourceFile');

  /**
   * @typedef {{
      isTypeOnly: boolean,
      namedImports: Array<{ name: string, alias?: string }>,
      moduleSpecifier: string,
      defaultImport?: string,
      namespacedImport?: String,
    }} NewDeclaration
   */

  /**
   * @type NewDeclaration[]
   */
  const newDeclarationsForFile = [];

  const importDeclarations = sourceFile.getImportDeclarations();

  localTimer.measure('getImportDeclarations');

  importDeclarations.map((declaration) => {
    const defaultModuleSpecifier = declaration.getModuleSpecifier().getLiteralValue();

    localTimer.measure('getDefaultModuleSpecifier');

    const specifiers = declaration.getNamedImports();

    localTimer.measure('getNamedImports');

    /**
     * @type NewDeclaration[]
     */
    const newDeclarations = [];

    const exportingFile = declaration.getModuleSpecifierSourceFile();

    specifiers.forEach((spec) => {
      const specSymbol = spec.getSymbol();

      localTimer.measure('getSpecSymbol');

      let symbol = specSymbol.isAlias() ? specSymbol.getAliasedSymbol() : specSymbol;

      localTimer.measure('maybeGetAliasedSymbol');

      const valueDeclaration = symbol.getValueDeclaration();

      let type = symbol.getDeclaredType();

      if (type.compilerType.intrinsicName === 'error') {
        type = undefined;
      }

      const isValueImport = !!valueDeclaration;
      const isTypeOnly = !!type && !isValueImport;

      let symbolSourceFile = symbol.getValueDeclaration()?.getSourceFile()
        || symbol.getDeclarations()?.[0]?.getSourceFile();

      let importPath = symbolSourceFile ?
        Path.relative(sourceFile.getDirectoryPath(), symbolSourceFile.getFilePath())
        : undefined;

      if (importPath && !importPath.startsWith('.')) {
        importPath = `./${importPath}`;
      }

      if (
        symbolSourceFile?.isDeclarationFile()
      ) {
        importPath = declaration.getModuleSpecifierValue();

        /**
         * @param { import('ts-morph').Symbol } importedSymbo
         * @param { import('ts-morph').SourceFile } exportingFile
         **/
        function getNextExport(importedSymbol, exportingFile) {
          const exportDeclarations = exportingFile?.getExportDeclarations() || [];

          /**
           * @type { import('ts-morph').ExportDeclaration }
           */
          let nextExportingDeclaration;

          declarationLoop:
          for (let exportDeclaration of exportDeclarations) {

            const namedExports = exportDeclaration.getNamedExports();

            for (let namedExport of namedExports) {
              let exportSymbol = namedExport.getSymbol();
              if (exportSymbol.isAlias()) {
                exportSymbol = exportSymbol.getAliasedSymbol()
              }

              if (importedSymbol.getFullyQualifiedName()
                === exportSymbol?.getFullyQualifiedName()
              ) {

                nextExportingDeclaration = exportDeclaration;

                break declarationLoop;
              }
            }


          }

          const nextExportingFile = nextExportingDeclaration?.getModuleSpecifierSourceFile();

          if (nextExportingDeclaration) {
            importPath = nextExportingDeclaration?.getModuleSpecifierValue()
          }

          if (nextExportingFile &&
            !nextExportingFile.isDeclarationFile()
          ) {
            getNextExport(importedSymbol, nextExportingFile);
          }

        }

        if (!exportingFile?.isDeclarationFile()) {
          getNextExport(symbol, exportingFile);
        }

      }

      const alias = specSymbol.getName();

      let name = (type && symbol.getName())
        || spec.compilerNode.propertyName?.text
        || alias;

      localTimer.measure('getName');

      const shouldModifyModuleSpecifier = !!importPath;

      let moduleSpecifier = defaultModuleSpecifier;

      if (shouldModifyModuleSpecifier) {
        moduleSpecifier = importPath
          .replace(/\.(d\.)?(ts|tsx)$/, '')
          .replace(/\/index$/, '')
          .replace(/^@types\//, '');
      }

      const nextImport = {
        isTypeOnly,
        namedImports: [
          {
            name: name,
            alias: name === alias ? undefined : alias,
          },
        ],
        moduleSpecifier,
      };

      localTimer.measure('getNextImport');

      newDeclarations.push(nextImport);

      // console.log(
      //   ...[
      //     'import',
      //     nextImport.isTypeOnly ? 'type' : '',
      //     nextImport.namedImports[0].name,
      //     nextImport.namedImports[0].alias ? `as ${nextImport.namedImports[0].alias}` : '',
      //     'from',
      //     moduleSpecifier,
      //   ].filter(Boolean)
      // );
    });

    if (newDeclarations.length) {
      const defaultImport = declaration.getDefaultImport();
      localTimer.measure('getDefaultImport');
      const namespacedImport = declaration.getNamespaceImport();
      localTimer.measure('getNamespaceImport');

      if (defaultImport) {
        newDeclarations.push({
          moduleSpecifier: defaultModuleSpecifier,
          defaultImport: defaultImport.compilerNode.escapedText,
        });
      }

      if (namespacedImport) {
        newDeclarations.push({
          moduleSpecifier: defaultModuleSpecifier,
          namespacedImport: namespacedImport.compilerNode.escapedText,
        });
      }
    }

    if (newDeclarations.length) {
      declaration.remove();
      localTimer.measure('removeDeclaration');
    }
    newDeclarationsForFile.push(...newDeclarations);
  });

  if (newDeclarationsForFile.length) {
    sourceFile.addImportDeclarations(newDeclarationsForFile);

    localTimer.measure('addImportDeclarations');

    sourceFile.organizeImports();

    localTimer.measure('organizeImports');

    const savePromise = sourceFile.save();

    savePromise.then(() => {
      localTimer.measure('saveFile');

      const report = engine.executeOnFiles([file]);

      localTimer.measure('executeOnFiles');

      CLIEngine.outputFixes(report);

      localTimer.measure('outputFixes');

      console.log('processed', file, `${index + 1}/${filesToProcessNow.length}`);
    });

    await savePromise;
  } else {
    console.log('processed', file, `${index + 1}/${filesToProcessNow.length}`);
  }
}, Promise.resolve());

promise
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
