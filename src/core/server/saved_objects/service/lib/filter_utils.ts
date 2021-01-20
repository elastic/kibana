/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';
import { get } from 'lodash';
import { SavedObjectsErrorHelpers } from './errors';
import { IndexMapping } from '../../mappings';
// @ts-expect-error no ts
import { esKuery } from '../../es_query';
type KueryNode = any;

const astFunctionType = ['is', 'range', 'nested'];

export const validateConvertFilterToKueryNode = (
  allowedTypes: string[],
  filter: string | KueryNode,
  indexMapping: IndexMapping
): KueryNode | undefined => {
  if (filter && indexMapping) {
    const filterKueryNode =
      typeof filter === 'string' ? esKuery.fromKueryExpression(filter) : filter;

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
        existingKueryNode.arguments[0].value = existingKueryNode.arguments[0].value.split('.')[1];
        const itemType = allowedTypes.filter((t) => t === item.type);
        if (itemType.length === 1) {
          set(
            filterKueryNode,
            path,
            esKuery.nodeTypes.function.buildNode('and', [
              esKuery.nodeTypes.function.buildNode('is', 'type', itemType[0]),
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
          nestedKeys: localNestedKeys,
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

const fieldDefined = (indexMappings: IndexMapping, key: string) => {
  const mappingKey = 'properties.' + key.split('.').join('.properties.');
  return get(indexMappings, mappingKey) != null;
};
