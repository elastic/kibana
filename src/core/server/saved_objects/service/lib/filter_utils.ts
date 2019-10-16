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
import { SavedObjectsErrorHelpers } from './errors';
import { IndexMapping } from '../../mappings';

export const validateConvertFilterToKueryNode = (
  allowedTypes: string[],
  filter: string,
  indexMapping: IndexMapping
): KueryNode => {
  if (filter && filter.length > 0 && indexMapping) {
    const filterKueryNode = fromKueryExpression(filter);

    const validationFilterKuery = validateFilterKueryNode(
      filterKueryNode,
      allowedTypes,
      indexMapping,
      filterKueryNode.type === 'function' && ['is', 'range'].includes(filterKueryNode.function)
    );

    if (validationFilterKuery.length === 0) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'If we have a filter options defined, we should always have validationFilterKuery defined too'
      );
    }

    if (validationFilterKuery.some(obj => obj.error != null)) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
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
        const itemType = allowedTypes.filter(t => t === item.type);
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
  indexMapping: IndexMapping,
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
          indexMapping,
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
          error: hasFilterKeyError(ast.value, types, indexMapping),
          isSavedObjectAttr: isSavedObjectAttr(ast.value, indexMapping),
          key: ast.value,
          type: getType(ast.value),
        },
      ];
    }
    return kueryNode;
  }, []);
};

const getType = (key: string) => (key.includes('.') ? key.split('.')[0] : null);

/**
 * Is this filter key referring to a a top-level SavedObject attribute such as
 * `updated_at` or `references`.
 *
 * @param key
 * @param indexMapping
 */
export const isSavedObjectAttr = (key: string, indexMapping: IndexMapping) => {
  const keySplit = key.split('.');
  if (keySplit.length === 1 && fieldDefined(indexMapping, keySplit[0])) {
    return true;
  } else if (keySplit.length === 2 && fieldDefined(indexMapping, keySplit[1])) {
    return true;
  } else {
    return false;
  }
};

export const hasFilterKeyError = (
  key: string,
  types: string[],
  indexMapping: IndexMapping
): string | null => {
  if (!key.includes('.')) {
    return `This key '${key}' need to be wrapped by a saved object type like ${types.join()}`;
  } else if (key.includes('.')) {
    const keySplit = key.split('.');

    if (keySplit.length <= 1 || !types.includes(keySplit[0])) {
      return `This type ${keySplit[0]} is not allowed`;
    }
    if (
      (keySplit.length === 2 && fieldDefined(indexMapping, key)) ||
      (keySplit.length > 2 && keySplit[1] !== 'attributes')
    ) {
      return `This key '${key}' does NOT match the filter proposition SavedObjectType.attributes.key`;
    }
    if (
      (keySplit.length === 2 && !fieldDefined(indexMapping, keySplit[1])) ||
      (keySplit.length > 2 &&
        !fieldDefined(indexMapping, keySplit[0] + '.' + keySplit.slice(2, keySplit.length)))
    ) {
      return `This key '${key}' does NOT exist in ${types.join()} saved object index patterns`;
    }
  }
  return null;
};

const fieldDefined = (indexMappings: IndexMapping, key: string) => {
  const mappingKey = 'properties.' + key.split('.').join('.properties.');
  return get(indexMappings, mappingKey) != null;
};
