/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getFieldSubtypeMulti } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

export type ShouldShowFieldInTableHandler = (fieldName: string) => boolean;

/**
 * Returns a function for checking whether we should display a field in the Documents column of the data table
 * If showMultiFields is set to false, it filters out multifields that have a parent, to prevent entries for multifields
 * like this: field, field.keyword, field.whatever
 * @param fields
 * @param dataView
 * @param showMultiFields
 */
export const getShouldShowFieldHandler = (
  fields: string[],
  dataView: DataView,
  showMultiFields: boolean
): ShouldShowFieldInTableHandler => {
  const showUnmapped = true;
  const fieldsToShowMap = new Map<string, boolean>();

  fields.forEach((fieldName) => {
    fieldsToShowMap.set(
      fieldName,
      canShowFieldInTable(fieldName, fields, dataView, showMultiFields)
    );
  });

  return (fieldName: string) => fieldsToShowMap.get(fieldName) ?? showUnmapped;
};

const canShowFieldInTable = (
  fieldName: string,
  fields: string[],
  dataView: DataView,
  showMultiFields: boolean
): boolean => {
  if (showMultiFields) {
    return true;
  }

  const mapped = dataView.fields.getByName(fieldName);

  if (!mapped) {
    return true;
  }

  const subTypeMulti = getFieldSubtypeMulti(mapped.spec);
  const isMultiField = Boolean(subTypeMulti?.multi);

  if (!isMultiField) {
    return true;
  }

  const parentName = subTypeMulti?.multi?.parent;
  return Boolean(parentName && !fields.includes(parentName)); // TODO: how to optimize this check? is it still relevant?
};
