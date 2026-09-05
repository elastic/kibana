/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Functions for converting stored field metadata to as-code field format
 *
 * CONVERSION APPROACH:
 * - Type-first: Uses the `type` property to distinguish composite vs primitive fields
 * - Composite fields: Subfields are keyed under `fields` with their short names
 * - Primitive fields: Mapped directly with optional script, format, and attribute metadata
 *
 * Three DataViewSpec maps are combined into a single `field_settings` map keyed by field name.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import {
  RUNTIME_FIELD_COMPOSITE_TYPE,
  type AsCodeRuntimeBaseField,
  type AsCodeFieldSettings,
  type AsCodeDataViewSpec,
  type AsCodeSavedDataView,
  type AsCodeSavedFieldSettings,
} from '@kbn/as-code-data-views-schema';
import { isNil, isPlainObject, omitBy, snakeCase } from 'lodash';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Serializable, SerializableArray } from '@kbn/utility-types/src/serializable';
import {
  COLOR_FORMAT_DEFAULT_PARAMS,
  DURATION_FORMAT_DEFAULT_PARAMS,
  FORMATS_WITH_PATTERN,
  FORMATS_WITHOUT_PARAMS,
  HISTOGRAM_FORMAT_DEFAULT_FORMAT,
  URL_DEFAULT_TYPE,
} from './constants';

/**
 * Convert stored field metadata maps from DataViewSpec to as-code field representations.
 *
 * Produces `field_settings` where runtime fields appear inline (with `type` and optional `script`)
 * alongside indexed-field display overrides.
 *
 * @param runtimeFields Map of field name → `{ type, script, fields? }` from DataViewSpec
 * @param fieldFormats Map of field name → display format `{ id, params }` from DataViewSpec
 * @param fieldAttrs Map of field name → `{ customLabel, customDescription }` from DataViewSpec
 * @returns `field_settings` map, or `undefined` when there is nothing to persist
 */
export function fromStoredFields<IncludePopularity extends boolean = false>(
  runtimeFields: DataViewSpec['runtimeFieldMap'] = {},
  fieldFormats: DataViewSpec['fieldFormats'] = {},
  fieldAttrs: DataViewSpec['fieldAttrs'] = {},
  includePopularity: IncludePopularity = false as IncludePopularity
): IncludePopularity extends false
  ? AsCodeDataViewSpec['field_settings']
  : AsCodeSavedDataView['field_settings'] {
  const fieldSettings: AsCodeDataViewSpec['field_settings'] = {};
  new Set([...Object.keys(fieldFormats), ...Object.keys(fieldAttrs)]).forEach((name) => {
    fieldSettings[name] = getCommonProperties(name, fieldAttrs, fieldFormats, includePopularity);
  });

  for (const [name, runtimeField] of Object.entries(runtimeFields)) {
    if (runtimeField.type === RUNTIME_FIELD_COMPOSITE_TYPE) {
      const fields = runtimeField.fields ?? {};

      const compositeFields: Record<string, AsCodeRuntimeBaseField> = {};
      for (const [subName, subField] of Object.entries(fields)) {
        const compositeName = `${name}.${subName}`;
        compositeFields[subName] = {
          ...fieldSettings[compositeName],
          type: subField.type,
        };
        delete fieldSettings[compositeName];
      }

      fieldSettings[name] = {
        type: RUNTIME_FIELD_COMPOSITE_TYPE,
        ...(runtimeField.script?.source !== undefined && { script: runtimeField.script.source }),
        fields: compositeFields,
      };
    } else {
      fieldSettings[name] = {
        ...fieldSettings[name],
        type: runtimeField.type,
        ...(runtimeField.script?.source !== undefined && { script: runtimeField.script.source }),
      };
    }
  }

  return Object.keys(fieldSettings).length > 0 ? fieldSettings : undefined;
}

function omitNilParams<T extends object>(value: T | undefined): T | undefined {
  if (value == null) return undefined;
  return omitBy(value, isNil) as T;
}

function getCommonProperties(
  name: string,
  fieldAttrs: NonNullable<DataViewSpec['fieldAttrs']>,
  fieldFormats: NonNullable<DataViewSpec['fieldFormats']>,
  includePopularity: boolean
): AsCodeFieldSettings | AsCodeSavedFieldSettings {
  const fieldAttr = fieldAttrs[name];
  const format = fieldFormats[name];
  const params = omitNilParams(fromStoredFieldFormatParams(format));

  return {
    ...(fieldAttr && 'customLabel' in fieldAttr && { custom_label: fieldAttr.customLabel }),
    ...(fieldAttr &&
      'customDescription' in fieldAttr && { custom_description: fieldAttr.customDescription }),
    ...(format?.id && { format: { type: format.id, ...(params && { params }) } }),
    ...(includePopularity &&
      fieldAttr &&
      'count' in fieldAttr &&
      fieldAttr.count !== undefined && { popularity: fieldAttr.count }),
  };
}

function parseBooleanValue(value: Serializable) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return COLOR_FORMAT_DEFAULT_PARAMS.boolean;
}

function parseUrlDimension(value: Serializable) {
  if (value == null || value === '') return undefined;
  const dimension = Number(value);
  return Number.isNaN(dimension) ? undefined : dimension;
}

function fromStoredFieldFormatParams(
  format: NonNullable<DataViewSpec['fieldFormats']>[string] | undefined
) {
  if (!format?.id) return undefined;
  if (FORMATS_WITHOUT_PARAMS.includes(format.id)) return undefined;

  const params = format.params || {};

  if (FORMATS_WITH_PATTERN.includes(format.id)) {
    return {
      pattern: params.pattern,
    };
  }

  if (format.id === 'color') {
    const colors = Array.isArray(params.colors) ? params.colors : [];
    const fieldType = params.fieldType ?? COLOR_FORMAT_DEFAULT_PARAMS.fieldType;

    return {
      field_type: fieldType,
      colors: colors
        .filter((color) => color !== null && color !== undefined)
        .map((color) => {
          const colorObject = (isPlainObject(color) ? color : {}) as SerializableRecord;
          const base = {
            text: colorObject.text ?? COLOR_FORMAT_DEFAULT_PARAMS.text,
            background: colorObject.background ?? COLOR_FORMAT_DEFAULT_PARAMS.background,
          };

          if (fieldType === 'number') {
            return {
              ...base,
              range: colorObject.range ?? COLOR_FORMAT_DEFAULT_PARAMS.range,
            };
          }

          if (fieldType === 'boolean') {
            return {
              ...base,
              boolean: parseBooleanValue(colorObject.boolean),
            };
          }

          return {
            ...base,
            regex: colorObject.regex ?? COLOR_FORMAT_DEFAULT_PARAMS.regex,
          };
        }),
    };
  }

  if (format.id === 'duration') {
    const outputFormat = params.outputFormat
      ? snakeCase(params.outputFormat.toString())
      : undefined;

    return {
      input_format: params.inputFormat ?? DURATION_FORMAT_DEFAULT_PARAMS.inputFormat,
      output_format: outputFormat ?? DURATION_FORMAT_DEFAULT_PARAMS.outputFormat,
      output_precision: params.outputPrecision,
      show_suffix: params.showSuffix,
      use_short_suffix: params.useShortSuffix,
      include_space_with_suffix: params.includeSpaceWithSuffix,
    };
  }

  if (format.id === 'geo_point') {
    const skipParams = !params.transform || params.transform === 'none';

    return skipParams
      ? undefined
      : {
          transform: params.transform,
        };
  }

  if (format.id === 'histogram') {
    return {
      format: params.id ?? HISTOGRAM_FORMAT_DEFAULT_FORMAT,
      pattern: (params.params as SerializableRecord)?.pattern,
    };
  }

  if (format.id === 'static_lookup') {
    const lookupEntries = ((params.lookupEntries ?? []) as SerializableArray)
      .filter((entry) => {
        if (!isPlainObject(entry)) return false;
        return !!(entry as SerializableRecord).key;
      })
      .map((entry) => ({
        key: (entry as SerializableRecord).key?.toString(),
        value: ((entry as SerializableRecord).value || '').toString(),
      }));

    return {
      lookup_entries: lookupEntries,
      unknown_key_value: params.unknownKeyValue,
    };
  }

  if (format.id === 'string') {
    const skipTransform = !params.transform || params.transform.toString() === 'false';

    return {
      transform: skipTransform ? undefined : params.transform,
    };
  }

  if (format.id === 'truncate') {
    return {
      field_length: params.fieldLength,
    };
  }

  if (format.id === 'url') {
    const type = params.type ?? URL_DEFAULT_TYPE;
    const base = {
      type,
      url_template: params.urlTemplate,
      label_template: params.labelTemplate,
    };

    if (type === 'img') {
      return {
        ...base,
        width: parseUrlDimension(params.width),
        height: parseUrlDimension(params.height),
      };
    }

    if (type === 'a') {
      return {
        ...base,
        open_link_in_current_tab: params.openLinkInCurrentTab,
      };
    }

    return base;
  }

  return params;
}
