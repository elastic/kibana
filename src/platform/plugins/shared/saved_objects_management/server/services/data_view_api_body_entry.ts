/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { savedDataViewSpecSchema, type AsCodeSavedDataView } from '@kbn/as-code-data-views-schema';
import {
  fromStoredDataViewToAsCodeSavedSchema,
  toStoredDataView,
} from '@kbn/as-code-data-views-transforms';
import type { DataViewAttributes, DataViewSpec, FieldSpec } from '@kbn/data-views-plugin/common';
import type { ApiBodyEntry, ApiBodyWarning } from '../types';

type DataViewBody = Omit<AsCodeSavedDataView, 'id'>;

const parseJson = <T>(value: string | undefined): T | undefined =>
  value ? JSON.parse(value) : undefined;

const stringifyIfSet = (value: object | undefined): string | undefined =>
  value && Object.keys(value).length > 0 ? JSON.stringify(value) : undefined;

const toSpec = ({
  title,
  name,
  timeFieldName,
  allowHidden,
  sourceFilters,
  runtimeFieldMap,
  fieldFormatMap,
  fieldAttrs,
  fields,
}: DataViewAttributes): DataViewSpec => {
  const storedFields = parseJson<FieldSpec[]>(fields) ?? [];
  return {
    title,
    // Data views saved without a name store an empty one, which the PUT schema rejects.
    name: name || undefined,
    timeFieldName,
    allowHidden,
    sourceFilters: parseJson(sourceFilters),
    runtimeFieldMap: parseJson(runtimeFieldMap),
    fieldFormats: parseJson(fieldFormatMap),
    fieldAttrs: parseJson(fieldAttrs),
    fields: Object.fromEntries(storedFields.map((field) => [field.name, field])),
  };
};

const getDroppedContent = ({
  type,
  typeMeta,
  allowNoIndex,
}: DataViewAttributes): ApiBodyWarning[] => [
  ...(type || typeMeta ? [{ message: "The data view's rollup settings can't be exported." }] : []),
  ...(allowNoIndex ? [{ message: "The data view's allowNoIndex setting can't be exported." }] : []),
];

/** Creates the `index-pattern` registry entry from the as-code data views transforms, since data views can't depend on this plugin. */
export const createDataViewApiBodyEntry = (): ApiBodyEntry<DataViewBody, DataViewAttributes> => ({
  getSchema: () => savedDataViewSpecSchema.omit({ id: true }),
  toApi: ({ attributes }) => ({
    // Scripted fields stay in the body, so the schema rejects it and the export reports them.
    body: omit(fromStoredDataViewToAsCodeSavedSchema(toSpec(attributes)), 'id'),
    warnings: getDroppedContent(attributes),
  }),
  toStored: (body) => {
    const spec = toStoredDataView(body);
    return {
      attributes: {
        title: body.index_pattern,
        name: spec.name,
        timeFieldName: spec.timeFieldName,
        allowHidden: spec.allowHidden,
        sourceFilters: stringifyIfSet(spec.sourceFilters),
        runtimeFieldMap: stringifyIfSet(spec.runtimeFieldMap),
        fieldFormatMap: stringifyIfSet(spec.fieldFormats),
        fieldAttrs: stringifyIfSet(spec.fieldAttrs),
      },
      references: [],
    };
  },
});
