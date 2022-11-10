/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNumber } from 'lodash';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { FieldFormatMap, DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsContentType } from '@kbn/field-formats-plugin/common';
import { isEmptyValue, DISPLAY_EMPTY_VALUE } from '../../../../common/last_value_utils';
import { getFieldFormats } from '../../../services';

export const createFieldFormatter = (
  fieldName: string = '',
  fieldFormatMap?: FieldFormatMap,
  contextType?: FieldFormatsContentType,
  hasColorRules: boolean = false,
  dataView?: DataView
) => {
  const serializedFieldFormat = fieldFormatMap?.[fieldName];
  // field formatting should be skipped either there's no such field format in fieldFormatMap
  // or it's color formatting and color rules are already applied
  const shouldSkipFormatting =
    !serializedFieldFormat ||
    (hasColorRules && serializedFieldFormat?.id === FIELD_FORMAT_IDS.COLOR);

  const fieldType = dataView?.getFieldByName(fieldName)?.type || 'number';
  const defaultFieldFormat =
    fieldType === 'date'
      ? { id: 'date' }
      : fieldType === 'string'
      ? { id: 'string' }
      : fieldType === 'boolean'
      ? { id: 'boolean' }
      : { id: 'number' };

  const fieldFormat = getFieldFormats().deserialize(
    shouldSkipFormatting ? defaultFieldFormat : serializedFieldFormat
  );

  return (value: unknown) => {
    if (isEmptyValue(value)) {
      return DISPLAY_EMPTY_VALUE;
    }
    return fieldType !== 'number' || isNumber(value) || !shouldSkipFormatting
      ? fieldFormat.convert(value, contextType)
      : value;
  };
};
