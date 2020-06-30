/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as ts from 'typescript';
import * as _ from 'lodash';
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
  const identifierDefinition: ts.Node = (source as any).locals.get(identifierName);
  if (!identifierDefinition) {
    throw new Error(`Unable to fine identifier in source ${identifierName}`);
  }
  const declarations = (identifierDefinition as any).declarations as ts.Node[];

  const latestDeclaration: ts.Node | false | undefined =
    Array.isArray(declarations) && declarations[declarations.length - 1];
  if (!latestDeclaration) {
    throw new Error(`Unable to fine declaration for identifier ${identifierName}`);
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

export function getVariableValue(node: ts.Node): string | Record<string, any> {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }

  if (ts.isObjectLiteralExpression(node)) {
    return serializeObject(node);
  }

  throw Error(`Unsuppored Node: cannot get value of node (${node.getText()}) of kind ${node.kind}`);
}

export function serializeObject(node: ts.Node) {
  if (!ts.isObjectLiteralExpression(node)) {
    throw new Error(`Expecting Object literal Expression got ${node.getText()}`);
  }

  const value: Record<string, any> = {};
  for (const property of node.properties) {
    const propertyName = property.name?.getText();
    if (typeof propertyName === 'undefined') {
      throw new Error(`Unable to get property name ${property.getText()}`);
    }
    if (ts.isPropertyAssignment(property)) {
      value[propertyName] = getVariableValue(property.initializer);
    } else {
      value[propertyName] = getVariableValue(property);
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
  const resolvedModuleSourceFile = program.getSourceFile(resolvedModule.resolvedFileName);
  if (!resolvedModuleSourceFile) {
    throw new Error(`Unable to find resolved module ${importedModuleName}`);
  }
  return resolvedModuleSourceFile;
}

export function getPropertyValue(
  node: ts.Node,
  program: ts.Program,
  config: Optional<{ chaseImport: boolean }> = {}
) {
  const { chaseImport = false } = config;

  if (ts.isPropertyAssignment(node)) {
    const { initializer } = node;

    if (ts.isIdentifier(initializer)) {
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
        const serializedObject = serializeObject(declarationNode.initializer);
        return serializedObject;
      }

      return getVariableValue(declaration);
    }

    return getVariableValue(initializer);
  }
}

export function pickDeep(collection: any, identity: any, thisArg?: any) {
  const picked: any = _.pick(collection, identity, thisArg);
  const collections = _.pick(collection, _.isObject, thisArg);

  _.each(collections, function (item, key) {
    let object;
    if (_.isArray(item)) {
      object = _.reduce(
        item,
        function (result, value) {
          const pickedDeep = pickDeep(value, identity, thisArg);
          if (!_.isEmpty(pickedDeep)) {
            result.push(pickedDeep);
          }
          return result;
        },
        [] as any[]
      );
    } else {
      object = pickDeep(item, identity, thisArg);
    }

    if (!_.isEmpty(object)) {
      picked[key || ''] = object;
    }
  });

  return picked;
}

export const flattenKeys = (obj: any, keyPath: any[] = []): any => {
  if (_.isObject(obj)) {
    return _.reduce(
      obj,
      (cum, next, key) => {
        const keys = [...keyPath, key];
        return _.merge(cum, flattenKeys(next, keys));
      },
      {}
    );
  }
  return { [keyPath.join('.')]: obj };
};

export function difference(actual: any, expected: any) {
  function changes(obj: any, base: any) {
    return _.transform(obj, function (result, value, key) {
      if (key && !_.isEqual(value, base[key])) {
        result[key] =
          _.isObject(value) && _.isObject(base[key]) ? changes(value, base[key]) : value;
      }
    });
  }
  return changes(actual, expected);
}

export function normalizePath(inputPath: string) {
  return normalize(path.relative('.', inputPath));
}
