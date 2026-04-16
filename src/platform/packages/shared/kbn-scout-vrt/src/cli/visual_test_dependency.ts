/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import FsPromises from 'fs/promises';
import path from 'path';
import ts from 'typescript';
import { REPO_ROOT } from '@kbn/repo-info';

const IMPORT_FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

interface ImportBinding {
  importedName: string;
  source: string;
}

interface ParsedModule {
  importBindings: Map<string, ImportBinding>;
  localInitializers: Map<string, ts.Expression | undefined>;
  sourceFile: ts.SourceFile;
}

const resolveRelativeImportCandidates = (importingFile: string, importPath: string): string[] => {
  const basePath = path.resolve(path.dirname(importingFile), importPath);
  const candidates = [
    ...IMPORT_FILE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...IMPORT_FILE_EXTENSIONS.map((extension) => path.join(basePath, `index${extension}`)),
  ];

  if (path.extname(basePath)) {
    candidates.unshift(basePath);
  }

  return candidates.filter((candidatePath) => {
    return (
      candidatePath.startsWith(REPO_ROOT) &&
      Fs.existsSync(candidatePath) &&
      Fs.statSync(candidatePath).isFile()
    );
  });
};

const parseModule = async (
  absoluteFilePath: string,
  cache: Map<string, ParsedModule>
): Promise<ParsedModule> => {
  const cachedModule = cache.get(absoluteFilePath);

  if (cachedModule) {
    return cachedModule;
  }

  const sourceText = await FsPromises.readFile(absoluteFilePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    absoluteFilePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const importBindings = new Map<string, ImportBinding>();
  const localInitializers = new Map<string, ts.Expression | undefined>();

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && statement.importClause) {
      const importClause = statement.importClause;
      const source = statement.moduleSpecifier.getText(sourceFile).slice(1, -1);

      if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
        for (const element of importClause.namedBindings.elements) {
          importBindings.set(element.name.text, {
            importedName: element.propertyName?.text ?? element.name.text,
            source,
          });
        }
      }
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          localInitializers.set(declaration.name.text, declaration.initializer);
        }
      }
    }
  }

  const parsedModule = {
    importBindings,
    localInitializers,
    sourceFile,
  };

  cache.set(absoluteFilePath, parsedModule);
  return parsedModule;
};

const isVisualImportBinding = (binding: ImportBinding): boolean =>
  binding.source === '@kbn/scout-vrt' && binding.importedName === 'visualTest';

const collectIdentifiers = (expression: ts.Expression): string[] => {
  const identifiers = new Set<string>();

  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node)) {
      identifiers.add(node.text);
    }

    ts.forEachChild(node, visit);
  };

  visit(expression);
  return Array.from(identifiers.values());
};

const createModuleExportCacheKey = (absoluteFilePath: string, exportName: string): string =>
  `${absoluteFilePath}::${exportName}`;

const createLocalBindingCacheKey = (absoluteFilePath: string, bindingName: string): string =>
  `${absoluteFilePath}::${bindingName}`;

const resolveExpressionToVisualTest = async (
  absoluteFilePath: string,
  expression: ts.Expression,
  exportCache: Map<string, Promise<boolean>>,
  parsedModuleCache: Map<string, ParsedModule>,
  localBindingCache: Map<string, Promise<boolean>>
): Promise<boolean> => {
  for (const identifier of collectIdentifiers(expression)) {
    if (
      await resolveLocalBindingToVisualTest(
        absoluteFilePath,
        identifier,
        exportCache,
        parsedModuleCache,
        localBindingCache
      )
    ) {
      return true;
    }
  }

  return false;
};

const resolveExportToVisualTest = async (
  absoluteFilePath: string,
  exportName: string,
  exportCache: Map<string, Promise<boolean>>,
  parsedModuleCache: Map<string, ParsedModule>,
  localBindingCache: Map<string, Promise<boolean>>
): Promise<boolean> => {
  const cacheKey = createModuleExportCacheKey(absoluteFilePath, exportName);
  const cachedValue = exportCache.get(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const resultPromise = (async () => {
    const parsedModule = await parseModule(absoluteFilePath, parsedModuleCache);

    for (const statement of parsedModule.sourceFile.statements) {
      if (
        ts.isExportDeclaration(statement) &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      ) {
        const moduleSpecifier = statement.moduleSpecifier
          ?.getText(parsedModule.sourceFile)
          .slice(1, -1);

        for (const element of statement.exportClause.elements) {
          const exportedName = element.name.text;

          if (exportedName !== exportName) {
            continue;
          }

          const sourceName = element.propertyName?.text ?? exportedName;

          if (moduleSpecifier) {
            if (moduleSpecifier === '@kbn/scout-vrt' && sourceName === 'visualTest') {
              return true;
            }

            if (!moduleSpecifier.startsWith('.')) {
              return false;
            }

            for (const candidatePath of resolveRelativeImportCandidates(
              absoluteFilePath,
              moduleSpecifier
            )) {
              if (
                await resolveExportToVisualTest(
                  candidatePath,
                  sourceName,
                  exportCache,
                  parsedModuleCache,
                  localBindingCache
                )
              ) {
                return true;
              }
            }

            return false;
          }

          return resolveLocalBindingToVisualTest(
            absoluteFilePath,
            sourceName,
            exportCache,
            parsedModuleCache,
            localBindingCache
          );
        }
      }

      if (
        ts.isVariableStatement(statement) &&
        statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        for (const declaration of statement.declarationList.declarations) {
          if (
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === exportName &&
            declaration.initializer
          ) {
            return resolveExpressionToVisualTest(
              absoluteFilePath,
              declaration.initializer,
              exportCache,
              parsedModuleCache,
              localBindingCache
            );
          }
        }
      }
    }

    return false;
  })();

  exportCache.set(cacheKey, resultPromise);
  return resultPromise;
};

const resolveLocalBindingToVisualTest = async (
  absoluteFilePath: string,
  bindingName: string,
  exportCache: Map<string, Promise<boolean>>,
  parsedModuleCache: Map<string, ParsedModule>,
  localBindingCache: Map<string, Promise<boolean>>
): Promise<boolean> => {
  const cacheKey = createLocalBindingCacheKey(absoluteFilePath, bindingName);
  const cachedValue = localBindingCache.get(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const resultPromise = (async () => {
    const parsedModule = await parseModule(absoluteFilePath, parsedModuleCache);
    const importBinding = parsedModule.importBindings.get(bindingName);

    if (importBinding) {
      if (isVisualImportBinding(importBinding)) {
        return true;
      }

      if (!importBinding.source.startsWith('.')) {
        return false;
      }

      for (const candidatePath of resolveRelativeImportCandidates(
        absoluteFilePath,
        importBinding.source
      )) {
        if (
          await resolveExportToVisualTest(
            candidatePath,
            importBinding.importedName,
            exportCache,
            parsedModuleCache,
            localBindingCache
          )
        ) {
          return true;
        }
      }

      return false;
    }

    const initializer = parsedModule.localInitializers.get(bindingName);

    if (!initializer) {
      return false;
    }

    return resolveExpressionToVisualTest(
      absoluteFilePath,
      initializer,
      exportCache,
      parsedModuleCache,
      localBindingCache
    );
  })();

  localBindingCache.set(cacheKey, resultPromise);
  return resultPromise;
};

const resolveSpecToVisualTest = async (
  absoluteFilePath: string,
  parsedModuleCache: Map<string, ParsedModule>,
  exportCache: Map<string, Promise<boolean>>,
  localBindingCache: Map<string, Promise<boolean>>
): Promise<boolean> => {
  const parsedModule = await parseModule(absoluteFilePath, parsedModuleCache);

  for (const [localName, binding] of parsedModule.importBindings) {
    if (
      !['test', 'visualTest'].includes(localName) &&
      !['test', 'visualTest'].includes(binding.importedName)
    ) {
      continue;
    }

    if (
      await resolveLocalBindingToVisualTest(
        absoluteFilePath,
        localName,
        exportCache,
        parsedModuleCache,
        localBindingCache
      )
    ) {
      return true;
    }
  }

  return false;
};

export const createVisualTestDependencyResolver = (): ((
  absoluteFilePath: string
) => Promise<boolean>) => {
  const parsedModuleCache = new Map<string, ParsedModule>();
  const exportCache = new Map<string, Promise<boolean>>();
  const localBindingCache = new Map<string, Promise<boolean>>();

  return async (absoluteFilePath: string): Promise<boolean> => {
    return resolveSpecToVisualTest(
      absoluteFilePath,
      parsedModuleCache,
      exportCache,
      localBindingCache
    );
  };
};

export const hasVisualTestDependency = async (absoluteFilePath: string): Promise<boolean> => {
  return createVisualTestDependencyResolver()(absoluteFilePath);
};
