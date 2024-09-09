/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldListItem } from '../types';
import type { ExistingFieldsReader } from './use_existing_fields';

export interface UseNewFieldsParams<T extends FieldListItem> {
  dataView?: DataView | null;
  allFields: T[] | null; // `null` is for loading indicator
  getNewFieldsBySpec?: (fields: FieldSpec[], dataView: DataView | null) => T[];
  fieldsExistenceReader: ExistingFieldsReader;
}

export interface UseNewFieldsResult<T extends FieldListItem> {
  allFieldsModified: T[] | null;
  hasNewFields: boolean;
}

/**
 * This hook is used to get the new fields of previous fields for wildcards request, and merges those
 * with the existing fields.
 */
export function useNewFields<T extends FieldListItem = DataViewField>({
  dataView,
  allFields,
  getNewFieldsBySpec,
  fieldsExistenceReader,
}: UseNewFieldsParams<T>): UseNewFieldsResult<T> {
  const dataViewId = dataView?.id;

  const newFields = useMemo(() => {
    const newLoadedFields =
      allFields && dataView?.id && getNewFieldsBySpec
        ? getNewFieldsBySpec(fieldsExistenceReader.getNewFields(dataView?.id), dataView)
        : null;

    return newLoadedFields?.length ? newLoadedFields : null;
  }, [allFields, dataView, fieldsExistenceReader, getNewFieldsBySpec]);

  const hasNewFields = Boolean(allFields && newFields && newFields.length > 0);

  const allFieldsModified = useMemo(() => {
    if (!allFields || !newFields?.length || !dataViewId) return allFields;
    // Filtering out fields that e.g. Discover provides with fields that were provided by the previous fieldsForWildcards request
    // These can be replaced by the new fields, which are mapped correctly, and therefore can be used in the right way
    const allFieldsExlNew = allFields.filter(
      (field) => !newFields.some((newField) => newField.name === field.name)
    );

    return [...allFieldsExlNew, ...newFields];
  }, [newFields, allFields, dataViewId]);

  return { allFieldsModified, hasNewFields };
}
