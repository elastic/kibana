/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getFieldSubtypeMulti } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

export const getFieldsToShow = (fields: string[], dataView: DataView, showMultiFields: boolean) => {
  if (showMultiFields) {
    return fields;
  }
  const fieldMap = {} as Record<string, boolean>;
  const childParentFieldsMap = {} as Record<string, string>;
  const parentFieldMap = {} as Record<string, boolean>;
  const mapping = (name: string) => dataView.fields.getByName(name);
  fields.forEach((key) => {
    const mapped = mapping(key);
    const subTypeMulti = mapped && getFieldSubtypeMulti(mapped.spec);
    const isMultiField = Boolean(subTypeMulti?.multi);
    if (mapped && subTypeMulti?.multi?.parent) {
      childParentFieldsMap[key] = subTypeMulti.multi.parent;
    }
    if (mapped && isMultiField) {
      parentFieldMap[key] = true;
    }
    fieldMap[key] = true;
  });
  return fields.filter((key: string) => {
    if (!parentFieldMap[key]) {
      return true;
    }
    const parent = childParentFieldsMap[key];
    return parent && !fieldMap[parent];
  });
};
