/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getFieldSubtypeMulti } from '../../../data_views/public';
import type { DataView } from '../../../data_views/public';

export const getFieldsToShow = (
  fields: string[],
  indexPattern: DataView,
  showMultiFields: boolean
) => {
  const childParentFieldsMap = {} as Record<string, string>;
  const mapping = (name: string) => indexPattern.fields.getByName(name);
  fields.forEach((key) => {
    const mapped = mapping(key);
    const subTypeMulti = mapped && getFieldSubtypeMulti(mapped.spec);
    if (mapped && subTypeMulti?.multi?.parent) {
      childParentFieldsMap[mapped.name] = subTypeMulti.multi.parent;
    }
  });
  return fields.filter((key: string) => {
    const fieldMapping = mapping(key);
    const subTypeMulti = fieldMapping && getFieldSubtypeMulti(fieldMapping.spec);
    const isMultiField = !!subTypeMulti?.multi;
    if (!isMultiField) {
      return true;
    }
    const parent = childParentFieldsMap[key];
    return showMultiFields || (parent && !fields.includes(parent));
  });
};
