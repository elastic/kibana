/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { forOwn, keyBy, isNumber, isBoolean, isPlainObject, isString } from 'lodash';
import { SimpleSavedObject } from '../../../../core/public';
import { castEsToKbnFieldTypeName } from '../../../data/public';
import { ObjectField } from '../management_section/types';
import { SavedObjectLoader } from '../../../saved_objects/public';

const maxRecursiveIterations = 20;

export function createFieldList(
  object: SimpleSavedObject,
  service?: SavedObjectLoader
): ObjectField[] {
  let fields = Object.entries(object.attributes as Record<string, any>).reduce(
    (objFields, [key, value]) => {
      return [...objFields, ...createFields(key, value)];
    },
    [] as ObjectField[]
  );
  // Special handling for references which isn't within "attributes"
  fields = [...fields, ...createFields('references', object.references)];

  if (service && (service as any).Class) {
    addFieldsFromClass((service as any).Class, fields);
  }

  return fields;
}

/**
 * Creates a field definition and pushes it to the memo stack. This function
 * is designed to be used in conjunction with _.reduce(). If the
 * values is plain object it will recurse through all the keys till it hits
 * a string, number or an array.
 *
 * @param {string} key The key of the field
 * @param {mixed} value The value of the field
 * @param {array} parents The parent keys to the field
 * @returns {array}
 */
const createFields = (key: string, value: any, parents: string[] = []): ObjectField[] => {
  const path = [...parents, key];
  if (path.length > maxRecursiveIterations) {
    return [];
  }

  const field: ObjectField = { type: 'text', name: path.join('.'), value };

  if (isString(field.value)) {
    try {
      field.value = JSON.stringify(JSON.parse(field.value), undefined, 2);
      field.type = 'json';
    } catch (err) {
      field.type = 'text';
    }
  } else if (isNumber(field.value)) {
    field.type = 'number';
  } else if (Array.isArray(field.value)) {
    field.type = 'array';
    field.value = JSON.stringify(field.value, undefined, 2);
  } else if (isBoolean(field.value)) {
    field.type = 'boolean';
  } else if (isPlainObject(field.value)) {
    let fields: ObjectField[] = [];
    forOwn(field.value, (childValue, childKey) => {
      fields = [...fields, ...createFields(childKey as string, childValue, path)];
    });
    return fields;
  }

  return [field];
};

const addFieldsFromClass = function (
  Class: { mapping: Record<string, string>; searchSource: any },
  fields: ObjectField[]
) {
  const fieldMap = keyBy(fields, 'name');

  forOwn(Class.mapping, (esType, name) => {
    if (!name || fieldMap[name]) {
      return;
    }

    const getFieldTypeFromEsType = () => {
      switch (castEsToKbnFieldTypeName(esType)) {
        case 'string':
          return 'text';
        case 'number':
          return 'number';
        case 'boolean':
          return 'boolean';
        default:
          return 'json';
      }
    };

    fields.push({
      name,
      type: getFieldTypeFromEsType(),
      value: undefined,
    });
  });

  if (Class.searchSource && !fieldMap['kibanaSavedObjectMeta.searchSourceJSON']) {
    fields.push({
      name: 'kibanaSavedObjectMeta.searchSourceJSON',
      type: 'json',
      value: '{}',
    });
  }

  if (!fieldMap.references) {
    fields.push({
      name: 'references',
      type: 'array',
      value: '[]',
    });
  }
};
