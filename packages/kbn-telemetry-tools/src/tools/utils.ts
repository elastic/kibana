/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';
import {
  pick,
  pickBy,
  isObject,
  forEach,
  isArray,
  reduce,
  isEmpty,
  merge,
  transform,
  isEqual,
} from 'lodash';
import * as path from 'path';
import glob from 'glob';
import { readFile, writeFile } from 'fs';
import { promisify } from 'util';
import normalize from 'normalize-path';
import { Optional } from '@kbn/utility-types';

export const readFileAsync = promisify(readFile);
export const writeFileAsync = promisify(writeFile);
export const globAsync = promisify(glob);

export function isPropertyWithKey(property: ts.Node, identifierName: string) {
  if (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)) {
    if (ts.isIdentifier(property.name)) {
      return property.name.text === identifierName;
    }
  }

  return false;
}

export function getProperty(objectNode: any, propertyName: string): ts.Node | null {
  let foundProperty = null;
  ts.visitNodes(objectNode?.properties || [], (node) => {
    if (isPropertyWithKey(node, propertyName)) {
      foundProperty = node;
      return node;
    }
  });

  return foundProperty;
}

export function getModuleSpecifier(node: ts.Node): string {
  if ((node as any).moduleSpecifier) {
    return (node as any).moduleSpecifier.text;
  }
  return getModuleSpecifier(node.parent);
}

export function getIdentifierDeclarationFromSource(node: ts.Node, source: ts.SourceFile) {
  if (!ts.isIdentifier(node)) {
    throw new Error(`node is not an identifier ${node.getText()}`);
  }

  const identifierName = node.getText();
  const identifierDefinition: ts.Node =
    (source as any).locals.get(identifierName) ||
    (source as any).symbol.exports.get(identifierName);
  if (!identifierDefinition) {
    throw new Error(`Unable to find identifier in source ${identifierName}`);
  }
  const declarations = (identifierDefinition as any).declarations as ts.Node[];

  const latestDeclaration: ts.Node | false | undefined =
    Array.isArray(declarations) && declarations[declarations.length - 1];
  if (!latestDeclaration) {
    throw new Error(`Unable to find declaration for identifier ${identifierName}`);
  }

  return latestDeclaration;
}

export function getIdentifierDeclaration(node: ts.Node) {
  const source = node.getSourceFile();
  if (!source) {
    throw new Error('Unable to get source from node; check program configs.');
  }

  return getIdentifierDeclarationFromSource(node, source);
}

export function getVariableValue(node: ts.Node, program: ts.Program): string | Record<string, any> {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }

  if (ts.isObjectLiteralExpression(node)) {
    return serializeObject(node, program);
  }

  if (ts.isIdentifier(node)) {
    const declaration = getIdentifierDeclaration(node);
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      return getVariableValue(declaration.initializer, program);
    } else {
      // Go fetch it in another file
      return getIdentifierValue(node, node, program, { chaseImport: true });
    }
  }

  if (ts.isSpreadAssignment(node)) {
    return getVariableValue(node.expression, program);
  }

  throw Error(
    `Unsupported Node: cannot get value of node (${node.getText()}) of kind ${node.kind} [${
      ts.SyntaxKind[node.kind]
    }]`
  );
}

export function serializeObject(node: ts.Node, program: ts.Program) {
  if (!ts.isObjectLiteralExpression(node)) {
    throw new Error(`Expecting Object literal Expression got ${node.getText()}`);
  }

  let value: Record<string, any> = {};
  for (const property of node.properties) {
    const propertyName = property.name?.getText();
    const val = ts.isPropertyAssignment(property)
      ? getVariableValue(property.initializer, program)
      : getVariableValue(property, program);

    if (typeof propertyName === 'undefined') {
      if (typeof val === 'object') {
        value = { ...value, ...val };
      } else {
        throw new Error(`Unable to get property name ${property.getText()}`);
      }
    } else {
      const cleanPropertyName = propertyName.replace(/["']/g, '');
      value[cleanPropertyName] = val;
    }
  }

  return value;
}

export function getResolvedModuleSourceFile(
  originalSource: ts.SourceFile,
  program: ts.Program,
  importedModuleName: string
) {
  const resolvedModule = (originalSource as any).resolvedModules.get(importedModuleName);
  if (!resolvedModule) {
    throw new Error(
      `Import for [${importedModuleName}] in [${originalSource.fileName}] could not be resolved by TypeScript`
    );
  }

  const resolvedModuleSourceFile = program.getSourceFile(resolvedModule.resolvedFileName);
  if (!resolvedModuleSourceFile) {
    throw new Error(`Unable to find resolved module ${importedModuleName}`);
  }
  return resolvedModuleSourceFile;
}

export function getIdentifierValue(
  node: ts.Node,
  initializer: ts.Identifier,
  program: ts.Program,
  config: Optional<{ chaseImport: boolean }> = {}
) {
  const { chaseImport = false } = config;
  const identifierName = initializer.getText();
  const declaration = getIdentifierDeclaration(initializer);
  if (ts.isImportSpecifier(declaration)) {
    if (!chaseImport) {
      throw new Error(
        `Value of node ${identifierName} is imported from another file. Chasing imports is not allowed.`
      );
    }

    const importedModuleName = getModuleSpecifier(declaration);

    const source = node.getSourceFile();
    const declarationSource = getResolvedModuleSourceFile(source, program, importedModuleName);
    const declarationNode = getIdentifierDeclarationFromSource(initializer, declarationSource);
    if (!ts.isVariableDeclaration(declarationNode)) {
      throw new Error(`Expected ${identifierName} to be variable declaration.`);
    }
    if (!declarationNode.initializer) {
      throw new Error(`Expected ${identifierName} to be initialized.`);
    }
    const serializedObject = serializeObject(declarationNode.initializer, program);
    return serializedObject;
  }

  return getVariableValue(declaration, program);
}

export function getPropertyValue(
  node: ts.Node,
  program: ts.Program,
  config: Optional<{ chaseImport: boolean }> = {}
) {
  if (ts.isPropertyAssignment(node)) {
    const { initializer } = node;

    if (ts.isIdentifier(initializer)) {
      return getIdentifierValue(node, initializer, program, config);
    }

    return getVariableValue(initializer, program);
  }
}

export function pickDeep(collection: any, identity: any) {
  const picked: any = pick(collection, identity);
  const collections = pickBy(collection, isObject);

  forEach(collections, function (item, key) {
    let object;
    if (isArray(item)) {
      object = reduce(
        item,
        function (result, value) {
          const pickedDeep = pickDeep(value, identity);
          if (!isEmpty(pickedDeep)) {
            result.push(pickedDeep);
          }
          return result;
        },
        [] as any[]
      );
    } else {
      object = pickDeep(item, identity);
    }

    if (!isEmpty(object)) {
      picked[key || ''] = object;
    }
  });

  return picked;
}

export const flattenKeys = (obj: any, keyPath: any[] = []): any => {
  if (isObject(obj)) {
    return reduce(
      obj,
      (cum, next, key) => {
        const keys = [...keyPath, key];
        return merge(cum, flattenKeys(next, keys));
      },
      {}
    );
  }
  return { [keyPath.join('.')]: obj };
};

type ObjectDict = Record<string, any>;
export function difference(actual: any, expected: any) {
  function changes(obj: ObjectDict, base: ObjectDict) {
    return transform(
      obj,
      function (result, value, key) {
        if (key && /@@INDEX@@/.test(`${key}`)) {
          // The type definition is an Index Signature, fuzzy searching for similar keys
          const regexp = new RegExp(`^${key}`.replace(/@@INDEX@@/g, '(.+)?'));
          const keysInBase = Object.keys(base)
            .map((k) => {
              const match = k.match(regexp);
              return match && match[0];
            })
            .filter((s): s is string => !!s);

          if (keysInBase.length === 0) {
            // Mark this key as wrong because we couldn't find any matching keys
            result[key] = value;
          }

          keysInBase.forEach((k) => {
            if (!isEqual(value, base[k])) {
              result[k] = isObject(value) && isObject(base[k]) ? changes(value, base[k]) : value;
            }
          });
        } else if (key && !isEqual(value, base[key])) {
          result[key] = isObject(value) && isObject(base[key]) ? changes(value, base[key]) : value;
        }
      },
      {} as ObjectDict
    );
  }
  return changes(actual, expected);
}

export function normalizePath(inputPath: string) {
  return normalize(path.relative('.', inputPath));
}
