/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getDataViewFieldSubtypeMulti } from '@kbn/es-query';
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
  if (showMultiFields) {
    return () => true;
  }

  const fieldsToShowMap = new Map<string, { parentName?: string; show: boolean }>();

  fields.forEach((fieldName) => {
    fieldsToShowMap.set(fieldName, canShowFieldInTable(fieldName, dataView));
  });

  return (fieldName: string) => {
    const result = fieldsToShowMap.get(fieldName);
    if (!result) {
      return true; // for unmapped
    }
    // if the parent of the multi field was not in `fields` array then show the multi field too
    return result.show || (!!result.parentName && !fieldsToShowMap.has(result.parentName));
  };
};

const canShowFieldInTable = (
  fieldName: string,
  dataView: DataView
): { parentName?: string; show: boolean } => {
  const mapped = dataView.fields.getByName(fieldName);

  if (!mapped) {
    return { show: true };
  }

  const subTypeMulti = getDataViewFieldSubtypeMulti(mapped.spec);
  const isMultiField = Boolean(subTypeMulti?.multi);

  return { show: !isMultiField, parentName: subTypeMulti?.multi?.parent };
};
