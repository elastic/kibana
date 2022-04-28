/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNumber } from 'lodash';
import handlebars from 'handlebars';
import { isEmptyValue, DISPLAY_EMPTY_VALUE } from '../../../../common/last_value_utils';
import { inputFormats, outputFormats, isDuration } from './durations';
import { getFieldFormats } from '../../../services';

export const createTickFormatter = (format = '0,0.[00]', template, getConfig = null) => {
  const fieldFormats = getFieldFormats();

  if (!template) template = '{{value}}';
  const render = handlebars.compile(template, { noEscape: true, knownHelpersOnly: true });
  let formatter;

  if (isDuration(format)) {
    const [from, to, decimals] = format.split(',');
    const DurationFormat = fieldFormats.getType('duration');

    formatter = new DurationFormat({
      inputFormat: inputFormats[from],
      outputFormat: outputFormats[to],
      outputPrecision: decimals,
    });
  } else {
    let FieldFormat = fieldFormats.getType(format);
    if (FieldFormat) {
      formatter = new FieldFormat(null, getConfig);
    } else {
      FieldFormat = fieldFormats.getType('number');
      formatter = new FieldFormat({ pattern: format }, getConfig);
    }
  }
  return (val) => {
    if (isEmptyValue(val)) {
      return DISPLAY_EMPTY_VALUE;
    }

    let value;

    if (!isNumber(val)) {
      value = val;
    } else {
      try {
        value = formatter.convert(val, 'text');
      } catch (e) {
        value = val;
      }
    }
    try {
      return render({ value });
    } catch (e) {
      return String(value);
    }
  };
};
