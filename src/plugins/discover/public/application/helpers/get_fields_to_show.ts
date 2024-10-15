/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IndexPattern, getFieldSubtypeMulti } from '../../../../data/common';

/**
 * Returns am array of fields to display in the Documents column of the data table
 * If showMultiFields is set to false, it filters out multifields that have a parent, to prevent entries for multifields
 * like this: field, field.keyword, field.whatever
 * @param fields
 * @param dataView
 * @param showMultiFields
 */
export const getFieldsToShow = (
  fields: string[],
  dataView: IndexPattern,
  showMultiFields: boolean
) => {
  if (showMultiFields) {
    return fields;
  }
  const fieldSet = new Set();
  const childParentFieldsMap = new Map();
  const parentFieldSet = new Set();
  fields.forEach((key) => {
    const mapped = dataView.fields.getByName(key);
    const subTypeMulti = mapped && getFieldSubtypeMulti(mapped.spec);
    const isMultiField = Boolean(subTypeMulti?.multi);
    if (mapped && subTypeMulti?.multi?.parent) {
      childParentFieldsMap.set(key, subTypeMulti.multi.parent);
    }
    if (mapped && isMultiField) {
      parentFieldSet.add(key);
    }
    fieldSet.add(key);
  });
  return fields.filter((key: string) => {
    if (!parentFieldSet.has(key)) {
      return true;
    }
    const parent = childParentFieldsMap.get(key);
    return parent && !fieldSet.has(parent);
  });
};
