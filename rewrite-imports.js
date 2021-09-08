/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const Path = require('path');
const Fs = require('fs');
const { Project } = require('ts-morph');
const { CLIEngine } = require('eslint');
const json5 = require('json5');

const { argv } = require('yargs');

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

const tsConfigFilePath = Path.resolve(argv.project || './tsconfig.json');

const handled = new Map();

function getProjects(path) {
  if (handled.has(path)) {
    return handled.get(path);
  }

  const config = json5.parse(Fs.readFileSync(path));

  const references =
    config.references?.map((ref) => {
      return Path.resolve(Path.dirname(path), ref.path);
    }) || [];

  const files = [...references.flatMap((ref) => getProjects(ref)), path];

  handled.set(path, files);

  return files;
}

const projects = Array.from(new Set(getProjects(tsConfigFilePath)));

if (argv.listProjects) {
  console.log(projects);
  return;
}

const skipDirs = [
  ...(argv.skip ? argv.skip.split(',') : []).map((path) => Path.resolve(__dirname, path)),
];

const includeDirs = argv.include
  ? argv.include.split(',').map((path) => Path.resolve(__dirname, path))
  : [];

const engine = new CLIEngine({
  fix: true,
  extensions: ['.ts', '.tsx'],
  rules: {
    '@kbn/eslint/no-restricted-paths': 0,
  },
});

const processingPromise = projects.reduce(async (prev, projectTsConfigFilePath) => {
  const dirsAlreadyProcessed = await prev;

  const project = new Project({
    tsConfigFilePath: projectTsConfigFilePath,
  });

  if (argv.listFiles) {
    const files = project.getSourceFiles().map((file) => file.getFilePath());
    console.log(JSON.stringify(files, null, 2));
    console.log(files.length, 'total');
    return [];
  }

  const dirname = Path.dirname(projectTsConfigFilePath);

  const shouldProcess = includeDirs.length
    ? includeDirs.some((includeDir) => dirname.startsWith(includeDir))
    : !skipDirs.some((skipDir) => dirname.startsWith(skipDir));

  timer.measure('createProject');

  const allFilesInProject = project.getSourceFiles().map((file) => file.getFilePath());

  timer.measure('gotSourceFiles');

  if (!shouldProcess) {
    console.log(
      `Skipping ${allFilesInProject.length} files belonging to ${projectTsConfigFilePath}`
    );
    return Array.from(new Set(dirsAlreadyProcessed.concat(allFilesInProject)));
  }

  console.log(`${allFilesInProject.length} files in project ${projectTsConfigFilePath}`);

  const filesToProcess = allFilesInProject.filter((file) => {
    return dirsAlreadyProcessed.every((dir) => !file.startsWith(dir));
  });

  console.log(filesToProcess.slice(0, 10));

  timer.measure('start processing');

  await filesToProcess.reduce(async (prev, file, index) => {
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
        const isTypeOnly = declaration.isTypeOnly() || (!!type && !isValueImport);

        const symbolSourceFile =
          symbol.getValueDeclaration()?.getSourceFile() ||
          symbol.getDeclarations()?.[0]?.getSourceFile();

        let importPath = symbolSourceFile
          ? Path.relative(sourceFile.getDirectoryPath(), symbolSourceFile.getFilePath())
          : undefined;

        if (importPath && !importPath.startsWith('.')) {
          importPath = `./${importPath}`;
        }

        const alias = specSymbol.getName();

        let name = spec.compilerNode.propertyName?.text || alias;

        let moduleSpecifier = defaultModuleSpecifier;

        if (!argv.typeOnly) {
          if (symbolSourceFile?.isDeclarationFile()) {
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

              declarationLoop: for (const exportDeclaration of exportDeclarations) {
                const namedExports = exportDeclaration.getNamedExports();

                for (const namedExport of namedExports) {
                  let exportSymbol = namedExport.getSymbol();
                  if (exportSymbol.isAlias()) {
                    exportSymbol = exportSymbol.getAliasedSymbol();
                  }

                  if (
                    importedSymbol.getFullyQualifiedName() === exportSymbol?.getFullyQualifiedName()
                  ) {
                    nextExportingDeclaration = exportDeclaration;

                    break declarationLoop;
                  }
                }
              }

              const nextExportingFile = nextExportingDeclaration?.getModuleSpecifierSourceFile();

              if (nextExportingDeclaration) {
                importPath = nextExportingDeclaration?.getModuleSpecifierValue();
              }

              if (nextExportingFile && !nextExportingFile.isDeclarationFile()) {
                getNextExport(importedSymbol, nextExportingFile);
              }
            }

            if (!exportingFile?.isDeclarationFile()) {
              getNextExport(symbol, exportingFile);
            } else {
              symbol = specSymbol;
            }
          }

          name = (symbol.compilerSymbol.parent && symbol.getName()) || name;

          localTimer.measure('getName');

          const shouldModifyModuleSpecifier = !!importPath;

          if (shouldModifyModuleSpecifier) {
            moduleSpecifier = importPath
              .replace(/\.(d\.)?(ts|tsx)$/, '')
              .replace(/\/index$/, '')
              .replace(/^@types\//, '');
          }
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

        if (argv.verbose) {
          console.log(
            ...[
              'import',
              nextImport.isTypeOnly ? 'type' : '',
              nextImport.namedImports[0].name,
              nextImport.namedImports[0].alias ? `as ${nextImport.namedImports[0].alias}` : '',
              'from',
              moduleSpecifier,
            ].filter(Boolean)
          );
        }
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

      for (const exportDeclaration of sourceFile.getExportDeclarations()) {
        if (exportDeclaration.isTypeOnly()) {
          continue;
        }

        /**
         * @type {Array<{
         *  isTypeOnly:boolean;
         *  namedExports:Array<{ alias:string; name:string }>
         * }>} namedExports
         */
        const namedExports = [];

        for (const spec of exportDeclaration.getNamedExports()) {
          const specSymbol = spec.getSymbol();
          let symbol = specSymbol;
          if (symbol && symbol.isAlias()) {
            symbol = symbol.getAliasedSymbol();
          }

          let type = symbol.getDeclaredType();

          if (type?.compilerType.intrinsicName === 'error') {
            type = undefined;
          }

          const name = symbol.getName();
          const alias = specSymbol.getName();

          namedExports.push({
            isTypeOnly: !!type && !symbol.getValueDeclaration(),
            namedExports: [
              {
                name,
                alias: name === alias ? undefined : alias,
              },
            ],
          });
        }

        if (namedExports.length) {
          const namespaceExport = exportDeclaration.getNamespaceExport();

          const moduleSpecifier = exportDeclaration.getModuleSpecifierValue();

          if (namespaceExport) {
            sourceFile.addExportDeclaration({
              isTypeOnly: namespaceExport.isTypeOnly(),
              namespaceExport: namespaceExport.compilerNode.escapedText,
              moduleSpecifier,
            });
          }

          sourceFile.addExportDeclarations(
            namedExports.map(({ isTypeOnly, namedExports: thisNamedExports }) => {
              if (argv.verbose) {
                console.log(
                  ...[
                    'export',
                    ...(isTypeOnly ? ['type'] : []),
                    thisNamedExports[0].name,
                    ...(thisNamedExports[0].alias ? ['as', thisNamedExports[0].alias] : []),
                    'from',
                    moduleSpecifier,
                  ]
                );
              }
              return {
                isTypeOnly,
                moduleSpecifier,
                namedExports: thisNamedExports,
              };
            })
          );

          exportDeclaration.remove();
        }
      }

      localTimer.measure('setExportDeclarationTypes');

      sourceFile.organizeImports();

      localTimer.measure('organizeImports');

      if (argv.test) {
        return;
      }

      const savePromise = sourceFile.save();

      savePromise.then(() => {
        localTimer.measure('saveFile');

        const report = engine.executeOnFiles([file]);

        localTimer.measure('executeOnFiles');

        CLIEngine.outputFixes(report);

        localTimer.measure('outputFixes');

        console.log('processed', file, `${index + 1}/${filesToProcess.length}`);
      });

      await savePromise;
    } else {
      console.log('processed', file, `${index + 1}/${filesToProcess.length}`);
    }
  }, Promise.resolve());

  return Array.from(new Set(dirsAlreadyProcessed.concat(Path.dirname(projectTsConfigFilePath))));
}, Promise.resolve([]));

processingPromise
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
