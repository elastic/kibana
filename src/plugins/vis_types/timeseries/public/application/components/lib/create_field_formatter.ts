/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNumber } from 'lodash';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { FieldFormatMap } from '@kbn/data-plugin/common';
import type { FieldFormatsContentType } from '@kbn/field-formats-plugin/common';
import { isEmptyValue, DISPLAY_EMPTY_VALUE } from '../../../../common/last_value_utils';
import { getFieldFormats } from '../../../services';

const DEFAULT_FIELD_FORMAT = { id: 'number' };

export const createFieldFormatter = (
  fieldName: string = '',
  fieldFormatMap?: FieldFormatMap,
  contextType?: FieldFormatsContentType,
  hasColorRules: boolean = false
) => {
  const serializedFieldFormat = fieldFormatMap?.[fieldName];
  // field formatting should be skipped either there's no such field format in fieldFormatMap
  // or it's color formatting and color rules are already applied
  const shouldSkipFormatting =
    !serializedFieldFormat ||
    (hasColorRules && serializedFieldFormat?.id === FIELD_FORMAT_IDS.COLOR);

  const fieldFormat = getFieldFormats().deserialize(
    shouldSkipFormatting ? DEFAULT_FIELD_FORMAT : serializedFieldFormat
  );

  return (value: unknown) => {
    if (isEmptyValue(value)) {
      return DISPLAY_EMPTY_VALUE;
    }
    return isNumber(value) || !shouldSkipFormatting
      ? fieldFormat.convert(value, contextType)
      : value;
  };
};
