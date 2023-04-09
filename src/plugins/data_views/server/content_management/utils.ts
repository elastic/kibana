/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '@kbn/core/server';
import { filter } from 'lodash';
import {
  DataViewSpec,
  RuntimeField,
  FieldSpec,
  FieldAttrs,
  DataViewAttributes,
  DataViewFieldMap,
} from '../../common';

function fieldArrayToMap(fields: FieldSpec[], fieldAttrs?: FieldAttrs) {
  return fields.reduce<DataViewFieldMap>((collector, field) => {
    collector[field.name] = {
      ...field,
      customLabel: fieldAttrs?.[field.name]?.customLabel,
      count: fieldAttrs?.[field.name]?.count,
    };
    return collector;
  }, {});
}

export function savedObjectToDataViewSpec(
  savedObject: SavedObject<DataViewAttributes>
): DataViewSpec {
  const {
    id,
    version,
    namespaces,
    attributes: {
      title,
      timeFieldName,
      fields,
      sourceFilters,
      fieldFormatMap,
      runtimeFieldMap,
      typeMeta,
      type,
      fieldAttrs,
      allowNoIndex,
      name,
    },
  } = savedObject;

  const parsedSourceFilters = sourceFilters ? JSON.parse(sourceFilters) : undefined;
  const parsedTypeMeta = typeMeta ? JSON.parse(typeMeta) : undefined;
  const parsedFieldFormatMap = fieldFormatMap ? JSON.parse(fieldFormatMap) : {};
  const parsedFields: FieldSpec[] = fields ? JSON.parse(fields) : [];
  const parsedFieldAttrs: FieldAttrs = fieldAttrs ? JSON.parse(fieldAttrs) : {};
  const parsedRuntimeFieldMap: Record<string, RuntimeField> = runtimeFieldMap
    ? JSON.parse(runtimeFieldMap)
    : {};

  return {
    id,
    version,
    namespaces,
    title,
    timeFieldName,
    sourceFilters: parsedSourceFilters,
    fields: fieldArrayToMap(parsedFields, parsedFieldAttrs),
    typeMeta: parsedTypeMeta,
    type,
    fieldFormats: parsedFieldFormatMap,
    fieldAttrs: parsedFieldAttrs,
    allowNoIndex,
    runtimeFieldMap: parsedRuntimeFieldMap,
    name,
  };
}

export function dataViewSpecToSavedObject(dataViewSpec: DataViewSpec): DataViewAttributes {
  const runtimeFieldMap = dataViewSpec.runtimeFieldMap;
  // only scripted fields are stored in the fields array
  const fields = dataViewSpec.fields ? filter(dataViewSpec.fields, (fld) => !!fld.scripted) : [];

  return {
    fieldAttrs: dataViewSpec.fieldAttrs ? JSON.stringify(dataViewSpec.fieldAttrs) : undefined,
    title: dataViewSpec.title!,
    timeFieldName: dataViewSpec.timeFieldName,
    sourceFilters: dataViewSpec.sourceFilters
      ? JSON.stringify(dataViewSpec.sourceFilters)
      : undefined,
    fields: JSON.stringify(fields),
    fieldFormatMap: dataViewSpec.fieldFormats
      ? JSON.stringify(dataViewSpec.fieldFormats)
      : undefined,
    type: dataViewSpec.type!,
    typeMeta: JSON.stringify(dataViewSpec.typeMeta ?? {}),
    allowNoIndex: dataViewSpec.allowNoIndex ? dataViewSpec.allowNoIndex : undefined,
    runtimeFieldMap: runtimeFieldMap ? JSON.stringify(runtimeFieldMap) : undefined,
    name: dataViewSpec.name,
  };
}
