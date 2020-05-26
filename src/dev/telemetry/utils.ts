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

export function getPropertyValue(node: ts.Node) {
  if (ts.isPropertyAssignment(node)) {
    if (ts.isStringLiteral(node.initializer)) {
      return node.initializer.text;
    }

    if (ts.isObjectLiteralExpression(node.initializer)) {
      const value: any = {};
      for (const property of node.initializer.properties) {
        value[property.name?.getText() || ''] = getPropertyValue(property);
      }
      return value;
    }
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
