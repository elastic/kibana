/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNumber } from 'lodash';
import type { IUiSettingsClient } from 'kibana/public';
import { getFieldFormats } from '../../../services';
import type { FieldFormatMap } from '../../../../../data/common';
import type { FieldFormatsContentType } from '../../../../../field_formats/common';

export const createFieldFormatter = (
  fieldName: string = '',
  fieldFormatMap?: FieldFormatMap,
  getConfig?: IUiSettingsClient['get'],
  contextType?: FieldFormatsContentType
) => {
  const serializedFieldFormat = fieldFormatMap?.[fieldName];
  const fieldFormats = getFieldFormats();

  if (serializedFieldFormat) {
    const fieldFormat = fieldFormats.deserialize(serializedFieldFormat);

    return (value: unknown) => fieldFormat.convert(value, contextType);
  } else {
    const DecoratedFieldFormat = fieldFormats.getType('number');
    const numberFormatter = DecoratedFieldFormat
      ? new DecoratedFieldFormat({ pattern: '0,0.[00]' }, getConfig)
      : undefined;

    return (value: unknown) =>
      isNumber(value) && numberFormatter ? numberFormatter.convert(value, 'text') : value;
  }
};
