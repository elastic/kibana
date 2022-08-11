/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';
import { get, cloneDeep } from 'lodash';
import * as esKuery from '@kbn/es-query';
import { SavedObjectsErrorHelpers } from './errors';
import { IndexMapping } from '../../mappings';

type KueryNode = any;

const astFunctionType = ['is', 'range', 'nested'];

export const validateConvertFilterToKueryNode = (
  allowedTypes: string[],
  filter: string | KueryNode,
  indexMapping: IndexMapping
): KueryNode | undefined => {
  if (filter && indexMapping) {
    let filterKueryNode =
      typeof filter === 'string' ? esKuery.fromKueryExpression(filter) : cloneDeep(filter);

    const validationFilterKuery = validateFilterKueryNode({
      astFilter: filterKueryNode,
      types: allowedTypes,
      indexMapping,
      storeValue:
        filterKueryNode.type === 'function' && astFunctionType.includes(filterKueryNode.function),
      hasNestedKey: filterKueryNode.type === 'function' && filterKueryNode.function === 'nested',
    });

    if (validationFilterKuery.length === 0) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'If we have a filter options defined, we should always have validationFilterKuery defined too'
      );
    }

    if (validationFilterKuery.some((obj) => obj.error != null)) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        validationFilterKuery
          .filter((obj) => obj.error != null)
          .map((obj) => obj.error)
          .join('\n')
      );
    }

    validationFilterKuery.forEach((item) => {
      const path: string[] = item.astPath.length === 0 ? [] : item.astPath.split('.');
      const existingKueryNode: KueryNode =
        path.length === 0 ? filterKueryNode : get(filterKueryNode, path);
      if (item.isSavedObjectAttr) {
        const keySavedObjectAttr = existingKueryNode.arguments[0].value.split('.')[1];
        existingKueryNode.arguments[0].value =
          keySavedObjectAttr === 'id' ? '_id' : keySavedObjectAttr;
        const itemType = allowedTypes.filter((t) => t === item.type);
        if (itemType.length === 1) {
          const kueryToAdd = esKuery.nodeTypes.function.buildNode('and', [
            esKuery.nodeTypes.function.buildNode('is', 'type', itemType[0]),
            existingKueryNode,
          ]);
          if (path.length > 0) {
            set(filterKueryNode, path, kueryToAdd);
          } else {
            filterKueryNode = kueryToAdd;
          }
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
};

interface ValidateFilterKueryNode {
  astPath: string;
  error: string;
  isSavedObjectAttr: boolean;
  key: string;
  type: string | null;
}

interface ValidateFilterKueryNodeParams {
  astFilter: KueryNode;
  types: string[];
  indexMapping: IndexMapping;
  hasNestedKey?: boolean;
  nestedKeys?: string;
  storeValue?: boolean;
  path?: string;
}

export const validateFilterKueryNode = ({
  astFilter,
  types,
  indexMapping,
  hasNestedKey = false,
  nestedKeys,
  storeValue = false,
  path = 'arguments',
}: ValidateFilterKueryNodeParams): ValidateFilterKueryNode[] => {
  let localNestedKeys: string | undefined;
  return astFilter.arguments.reduce((kueryNode: string[], ast: KueryNode, index: number) => {
    if (hasNestedKey && ast.type === 'literal' && ast.value != null) {
      localNestedKeys = ast.value;
    } else if (ast.type === 'literal' && ast.value && typeof ast.value === 'string') {
      const key = ast.value.replace('.attributes', '');
      const mappingKey = 'properties.' + key.split('.').join('.properties.');
      const field = get(indexMapping, mappingKey);
      if (field != null && field.type === 'nested') {
        localNestedKeys = ast.value;
      }
    }

    if (ast.arguments) {
      const myPath = `${path}.${index}`;
      return [
        ...kueryNode,
        ...validateFilterKueryNode({
          astFilter: ast,
          types,
          indexMapping,
          storeValue: ast.type === 'function' && astFunctionType.includes(ast.function),
          path: `${myPath}.arguments`,
          hasNestedKey: ast.type === 'function' && ast.function === 'nested',
          nestedKeys: localNestedKeys || nestedKeys,
        }),
      ];
    }
    if (storeValue && index === 0) {
      const splitPath = path.split('.');
      return [
        ...kueryNode,
        {
          astPath: splitPath.slice(0, splitPath.length - 1).join('.'),
          error: hasFilterKeyError(
            nestedKeys != null ? `${nestedKeys}.${ast.value}` : ast.value,
            types,
            indexMapping
          ),
          isSavedObjectAttr: isSavedObjectAttr(
            nestedKeys != null ? `${nestedKeys}.${ast.value}` : ast.value,
            indexMapping
          ),
          key: nestedKeys != null ? `${nestedKeys}.${ast.value}` : ast.value,
          type: getType(nestedKeys != null ? `${nestedKeys}.${ast.value}` : ast.value),
        },
      ];
    }
    return kueryNode;
  }, []);
};

const getType = (key: string | undefined | null) =>
  key != null && key.includes('.') ? key.split('.')[0] : null;

/**
 * Is this filter key referring to a a top-level SavedObject attribute such as
 * `updated_at` or `references`.
 *
 * @param key
 * @param indexMapping
 */
export const isSavedObjectAttr = (key: string | null | undefined, indexMapping: IndexMapping) => {
  const keySplit = key != null ? key.split('.') : [];
  if (keySplit.length === 1 && fieldDefined(indexMapping, keySplit[0])) {
    return true;
  } else if (keySplit.length === 2 && keySplit[1] === 'id') {
    return true;
  } else if (keySplit.length === 2 && fieldDefined(indexMapping, keySplit[1])) {
    return true;
  } else {
    return false;
  }
};

export const hasFilterKeyError = (
  key: string | null | undefined,
  types: string[],
  indexMapping: IndexMapping
): string | null => {
  if (key == null) {
    return `The key is empty and needs to be wrapped by a saved object type like ${types.join()}`;
  }
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
        !fieldDefined(
          indexMapping,
          `${keySplit[0]}.${keySplit.slice(2, keySplit.length).join('.')}`
        ))
    ) {
      return `This key '${key}' does NOT exist in ${types.join()} saved object index patterns`;
    }
  }
  return null;
};

export const fieldDefined = (indexMappings: IndexMapping, key: string): boolean => {
  const mappingKey = 'properties.' + key.split('.').join('.properties.');
  if (get(indexMappings, mappingKey) != null) {
    return true;
  }

  if (mappingKey === 'properties.id') {
    return true;
  }

  // If the `mappingKey` does not match a valid path, before returning false,
  // we want to check and see if the intended path was for a multi-field
  // such as `x.attributes.field.text` where `field` is mapped to both text
  // and keyword
  const propertiesAttribute = 'properties';
  const indexOfLastProperties = mappingKey.lastIndexOf(propertiesAttribute);
  const fieldMapping = mappingKey.substr(0, indexOfLastProperties);
  const fieldType = mappingKey.substr(
    mappingKey.lastIndexOf(propertiesAttribute) + `${propertiesAttribute}.`.length
  );
  const mapping = `${fieldMapping}fields.${fieldType}`;
  if (get(indexMappings, mapping) != null) {
    return true;
  }

  // If the path is for a flattened type field, we'll assume the mappings are defined.
  const keys = key.split('.');
  for (let i = 0; i < keys.length; i++) {
    const path = `properties.${keys.slice(0, i + 1).join('.properties.')}`;
    if (get(indexMappings, path)?.type === 'flattened') {
      return true;
    }
  }

  return false;
};
