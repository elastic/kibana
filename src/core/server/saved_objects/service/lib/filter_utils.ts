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

import { fromKueryExpression, KueryNode, nodeTypes } from '@kbn/es-query';
import { get, set } from 'lodash';

import { SavedObjectsIndexPattern, SavedObjectsIndexPatternField } from './cache_index_patterns';

export const validateConvertFilterToKueryNode = (
  types: string[],
  filter: string,
  indexPattern: SavedObjectsIndexPattern | undefined
): KueryNode => {
  if (filter && filter.length > 0 && indexPattern) {
    const filterKueryNode = fromKueryExpression(filter);

    const typeIndexPatterns = getSavedObjectTypeIndexPatterns(types, indexPattern);
    const validationFilterKuery = validateFilterKueryNode(
      filterKueryNode,
      types,
      typeIndexPatterns,
      filterKueryNode.type === 'function' && ['is', 'range'].includes(filterKueryNode.function)
    );

    if (validationFilterKuery.length === 0) {
      throw new TypeError(
        'If we have a filter options defined, we should always have validationFilterKuery defined too'
      );
    }

    if (validationFilterKuery.some(obj => obj.error != null)) {
      throw new TypeError(
        validationFilterKuery
          .filter(obj => obj.error != null)
          .map(obj => obj.error)
          .join('\n')
      );
    }

    validationFilterKuery.forEach(item => {
      const path: string[] = item.astPath.length === 0 ? [] : item.astPath.split('.');
      const existingKueryNode: KueryNode =
        path.length === 0 ? filterKueryNode : get(filterKueryNode, path);
      if (item.isSavedObjectAttr) {
        existingKueryNode.arguments[0].value = existingKueryNode.arguments[0].value.split('.')[1];
        const itemType = types.filter(t => t === item.type);
        if (itemType.length === 1) {
          set(
            filterKueryNode,
            path,
            nodeTypes.function.buildNode('and', [
              nodeTypes.function.buildNode('is', 'type', itemType[0]),
              existingKueryNode,
            ])
          );
        }
      } else {
        existingKueryNode.arguments[0].value = existingKueryNode.arguments[0].value.replace(
          '.attributes',
          ''
        );
        set(filterKueryNode, path, existingKueryNode);
      }
    });
    return filterKueryNode;
  }
  return null;
};

export const getSavedObjectTypeIndexPatterns = (
  types: string[],
  indexPattern: SavedObjectsIndexPattern | undefined
): SavedObjectsIndexPatternField[] => {
  return indexPattern != null
    ? indexPattern.fields.filter(
        ip =>
          !ip.name.includes('.') || (ip.name.includes('.') && types.includes(ip.name.split('.')[0]))
      )
    : [];
};

interface ValidateFilterKueryNode {
  astPath: string;
  error: string;
  isSavedObjectAttr: boolean;
  key: string;
  type: string | null;
}

export const validateFilterKueryNode = (
  astFilter: KueryNode,
  types: string[],
  typeIndexPatterns: SavedObjectsIndexPatternField[],
  storeValue: boolean = false,
  path: string = 'arguments'
): ValidateFilterKueryNode[] => {
  return astFilter.arguments.reduce((kueryNode: string[], ast: KueryNode, index: number) => {
    if (ast.arguments) {
      const myPath = `${path}.${index}`;
      return [
        ...kueryNode,
        ...validateFilterKueryNode(
          ast,
          types,
          typeIndexPatterns,
          ast.type === 'function' && ['is', 'range'].includes(ast.function),
          `${myPath}.arguments`
        ),
      ];
    }
    if (storeValue && index === 0) {
      const splitPath = path.split('.');
      return [
        ...kueryNode,
        {
          astPath: splitPath.slice(0, splitPath.length - 1).join('.'),
          error: hasFilterKeyError(ast.value, types, typeIndexPatterns),
          isSavedObjectAttr: isSavedObjectAttr(ast.value, typeIndexPatterns),
          key: ast.value,
          type: getType(ast.value),
        },
      ];
    }
    return kueryNode;
  }, []);
};

const getType = (key: string) => (key.includes('.') ? key.split('.')[0] : null);

export const isSavedObjectAttr = (
  key: string,
  typeIndexPatterns: SavedObjectsIndexPatternField[]
) => {
  const splitKey = key.split('.');
  if (splitKey.length === 1 && typeIndexPatterns.some(tip => tip.name === splitKey[0])) {
    return true;
  } else if (splitKey.length > 1 && typeIndexPatterns.some(tip => tip.name === splitKey[1])) {
    return true;
  }
  return false;
};

export const hasFilterKeyError = (
  key: string,
  types: string[],
  typeIndexPatterns: SavedObjectsIndexPatternField[]
): string | null => {
  if (!key.includes('.')) {
    return `This key '${key}' need to be wrapped by a saved object type like ${types.join()}`;
  } else if (key.includes('.')) {
    const keySplit = key.split('.');
    if (keySplit.length <= 1 || !types.includes(keySplit[0])) {
      return `This type ${keySplit[0]} is not allowed`;
    }
    if (
      (keySplit.length === 2 && typeIndexPatterns.some(tip => tip.name === key)) ||
      (keySplit.length > 2 && types.includes(keySplit[0]) && keySplit[1] !== 'attributes')
    ) {
      return `This key '${key}' does NOT match the filter proposition SavedObjectType.attributes.key`;
    }
    if (
      (keySplit.length === 2 && !typeIndexPatterns.some(tip => tip.name === keySplit[1])) ||
      (keySplit.length > 2 &&
        !typeIndexPatterns.some(
          tip =>
            tip.name === [...keySplit.slice(0, 1), ...keySplit.slice(2, keySplit.length)].join('.')
        ))
    ) {
      return `This key '${key}' does NOT exist in ${types.join()} saved object index patterns`;
    }
  }
  return null;
};
