/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNumber } from 'lodash';
import { getFieldFormats } from '../../../services';
import { isEmptyValue, DISPLAY_EMPTY_VALUE } from '../../../../common/last_value_utils';
import type { FieldFormatMap } from '../../../../../data/common';
import type { FieldFormatsContentType } from '../../../../../field_formats/common';

export const createFieldFormatter = (
  fieldName: string = '',
  fieldFormatMap?: FieldFormatMap,
  contextType?: FieldFormatsContentType
) => {
  const serializedFieldFormat = fieldFormatMap?.[fieldName];
  const fieldFormat = getFieldFormats().deserialize(serializedFieldFormat ?? { id: 'number' });

  return (value: unknown) => {
    if (isEmptyValue(value)) {
      return DISPLAY_EMPTY_VALUE;
    }
    return serializedFieldFormat || isNumber(value)
      ? fieldFormat.convert(value, contextType)
      : value;
  };
};
