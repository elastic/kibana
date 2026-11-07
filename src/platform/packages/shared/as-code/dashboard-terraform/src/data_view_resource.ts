/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec, RuntimeFieldSpec, FieldAttrSet } from '@kbn/data-views-types';
import type { JsonObject, Serializable, SerializableRecord } from '@kbn/utility-types';

/** A data view resource's body, with the data view spec paths of the settings it cannot hold. */
export interface DataViewResource {
  body: JsonObject;
  droppedFields: string[];
}

type Drop = (path: string) => void;

const isRecord = (value: Serializable): value is SerializableRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type ParamKind = 'string' | 'integer' | 'boolean';
const hasKind = (value: Serializable, kind: ParamKind): value is string | number | boolean =>
  kind === 'integer' ? Number.isInteger(value) : typeof value === kind;

// The field format parameters the provider types, by their name in the data view spec.
const FORMAT_PARAMS: Record<string, [attribute: string, kind: ParamKind]> = {
  pattern: ['pattern', 'string'],
  urlTemplate: ['urltemplate', 'string'],
  labelTemplate: ['labeltemplate', 'string'],
  inputFormat: ['input_format', 'string'],
  outputFormat: ['output_format', 'string'],
  outputPrecision: ['output_precision', 'integer'],
  includeSpaceWithSuffix: ['include_space_with_suffix', 'boolean'],
  useShortSuffix: ['use_short_suffix', 'boolean'],
  timezone: ['timezone', 'string'],
  fieldType: ['field_type', 'string'],
  fieldLength: ['field_length', 'integer'],
  transform: ['transform', 'string'],
  unknownKeyValue: ['unknown_key_value', 'string'],
  type: ['type', 'string'],
  width: ['width', 'integer'],
  height: ['height', 'integer'],
};
const COLOR_KEYS = ['range', 'regex', 'text', 'background'];

// Keeps the string-valued `keys` of each item, except `ignored` ones; anything else is dropped.
const mapItems = (
  items: Serializable,
  {
    keys,
    required = [],
    ignored = [],
  }: { keys: string[]; required?: string[]; ignored?: string[] },
  path: string,
  drop: Drop
): JsonObject[] | undefined => {
  if (!Array.isArray(items)) {
    drop(path);
    return undefined;
  }
  return items.flatMap((item, i) => {
    if (!isRecord(item) || required.some((key) => typeof item[key] !== 'string')) {
      drop(`${path}[${i}]`);
      return [];
    }
    const mapped: JsonObject = {};
    for (const [key, value] of Object.entries(item)) {
      if (ignored.includes(key)) continue;
      if (keys.includes(key) && typeof value === 'string') mapped[key] = value;
      else drop(`${path}[${i}].${key}`);
    }
    return [mapped];
  });
};

const mapFormatParams = (params: SerializableRecord, path: string, drop: Drop): JsonObject => {
  const mapped: JsonObject = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (key === 'colors') {
      // Kibana's editor writes `boolean` on every color rule, but only a boolean field uses it.
      const ignored = params.fieldType === 'boolean' ? [] : ['boolean'];
      const colors = mapItems(value, { keys: COLOR_KEYS, ignored }, `${path}.colors`, drop);
      if (colors) mapped.colors = colors;
      continue;
    }
    if (key === 'lookupEntries') {
      const keys = ['key', 'value'];
      const entries = mapItems(value, { keys, required: keys }, `${path}.lookupEntries`, drop);
      if (entries) mapped.lookup_entries = entries;
      continue;
    }
    const param = FORMAT_PARAMS[key];
    if (param && hasKind(value, param[1])) mapped[param[0]] = value;
    else drop(`${path}.${key}`);
  }
  return mapped;
};

const mapFieldFormats = (
  formats: DataViewSpec['fieldFormats'] = {},
  drop: Drop
): JsonObject | undefined => {
  const mapped: JsonObject = {};
  for (const [name, { id, params }] of Object.entries(formats)) {
    const path = `fieldFormats.${name}`;
    if (!id) {
      drop(path);
      continue;
    }
    const mappedParams = params ? mapFormatParams(params, `${path}.params`, drop) : {};
    mapped[name] = Object.keys(mappedParams).length ? { id, params: mappedParams } : { id };
  }
  return Object.keys(mapped).length ? mapped : undefined;
};

// A runtime field without a script, or a composite one, has no counterpart in `runtime_field_map`.
const mapRuntimeFields = (
  fields: Record<string, RuntimeFieldSpec> = {},
  drop: Drop
): JsonObject | undefined => {
  const mapped: JsonObject = {};
  for (const [name, { type, script }] of Object.entries(fields)) {
    if (type === 'composite' || !script) drop(`runtimeFieldMap.${name}`);
    else mapped[name] = { type, script_source: script.source };
  }
  return Object.keys(mapped).length ? mapped : undefined;
};

const mapFieldAttrs = (
  attrs: Record<string, FieldAttrSet> = {},
  drop: Drop
): JsonObject | undefined => {
  const mapped: JsonObject = {};
  for (const [name, { customLabel, count, customDescription }] of Object.entries(attrs)) {
    if (customDescription) drop(`fieldAttrs.${name}.customDescription`);
    const attr: JsonObject = {
      ...(customLabel && { custom_label: customLabel }),
      ...(count !== undefined && { count }),
    };
    if (Object.keys(attr).length) mapped[name] = attr;
  }
  return Object.keys(mapped).length ? mapped : undefined;
};

/** Maps a data view spec by hand (ADR 0003) onto an `elasticstack_kibana_data_view` body, reporting what it drops. */
export const toDataViewResource = ({
  title,
  name,
  timeFieldName,
  allowNoIndex,
  allowHidden,
  type,
  typeMeta,
  sourceFilters = [],
  fieldFormats,
  runtimeFieldMap,
  fieldAttrs,
  fields = {},
}: DataViewSpec & { title: string }): DataViewResource => {
  const droppedFields: string[] = [];
  const drop: Drop = (path) => droppedFields.push(path);
  if (allowHidden) drop('allowHidden');
  if (type && type !== 'default') drop('type');
  if (typeMeta && Object.keys(typeMeta).length) drop('typeMeta');
  // `clientId` only keys a source filter in the editor, so it is not a setting the resource loses.
  const sourceFilterValues = sourceFilters.map(({ value }) => value);
  const mappedFormats = mapFieldFormats(fieldFormats, drop);
  const mappedRuntimeFields = mapRuntimeFields(runtimeFieldMap, drop);
  const mappedFieldAttrs = mapFieldAttrs(fieldAttrs, drop);
  // Scripted fields are the only settings the legacy field list still holds; the provider has none.
  for (const field of Object.values(fields)) {
    if (field.scripted) drop(`fields.${field.name}`);
  }
  return {
    body: {
      data_view: {
        title,
        ...(name && { name }),
        ...(timeFieldName && { time_field_name: timeFieldName }),
        ...(allowNoIndex && { allow_no_index: true }),
        ...(sourceFilterValues.length && { source_filters: sourceFilterValues }),
        ...(mappedFormats && { field_formats: mappedFormats }),
        ...(mappedRuntimeFields && { runtime_field_map: mappedRuntimeFields }),
        ...(mappedFieldAttrs && { field_attrs: mappedFieldAttrs }),
      },
    },
    droppedFields,
  };
};
