/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { ExistingFieldsReader, type FieldListItem, GroupedFieldsParams } from '../..';

/**
 * This hook is used to get the new fields of previous fields for wildcards request, and merges those
 * with the existing fields.
 */
export function useNewFields<T extends FieldListItem = DataViewField>({
  dataView,
  allFields,
  getNewFieldsBySpec,
  fieldsExistenceReader,
}: {
  dataView?: DataView | null;
  allFields: GroupedFieldsParams<T>['allFields'];
  getNewFieldsBySpec: GroupedFieldsParams<T>['getNewFieldsBySpec'];
  fieldsExistenceReader: ExistingFieldsReader;
}) {
  const newFields =
    allFields && dataView?.id && getNewFieldsBySpec
      ? getNewFieldsBySpec(fieldsExistenceReader.getNewFields(dataView?.id), dataView)
      : null;
  const hasNewFields = Boolean(allFields && newFields && newFields.length > 0);

  const allFieldsModified = useMemo(() => {
    if (!allFields || !newFields?.length || !dataView) return allFields;
    // Filtering out fields that e.g. Discover provides with fields that were provided by the previous fieldsForWildcards request
    // These can be replaced by the new fields, which are mapped correctly, and therefore can be used in the right way
    const allFieldsExlNew =
      allFields && newFields
        ? allFields.filter((field) => !newFields.some((newField) => newField.name === field.name))
        : allFields;

    return newFields ? [...allFieldsExlNew, ...newFields] : allFields;
  }, [newFields, allFields, dataView]);

  return { allFieldsModified, hasNewFields };
}
