/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import handlebars from 'handlebars/dist/handlebars';
import { durationInputOptions } from './durations';
import { capitalize, isNumber } from 'lodash';
import { fieldFormats } from 'ui/registry/field_formats';

const durationsLookup = durationInputOptions.reduce((acc, row) => {
  acc[row.value] = row.label;
  return acc;
}, {});

export default (format = '0,0.[00]', template, getConfig = null) => {
  if (!template) template = '{{value}}';
  const render = handlebars.compile(template, { knownHelpersOnly: true });
  const durationFormatTest = /[pnumshdwMY]+,[pnumshdwMY]+,\d+/;
  let formatter;
  if (durationFormatTest.test(format)) {
    const [from, to, decimals] = format.split(',');
    const inputFormat = durationsLookup[from];
    const outputFormat = `as${capitalize(durationsLookup[to])}`;
    const DurationFormat = fieldFormats.getType('duration');
    formatter = new DurationFormat({
      inputFormat,
      outputFormat,
      outputPrecision: decimals
    });
  } else {
    let FieldFormat = fieldFormats.getType(format);
    if (FieldFormat) {
      formatter = new FieldFormat(null, getConfig);
    }
    else {
      FieldFormat = fieldFormats.getType('number');
      formatter = new FieldFormat({ pattern: format }, getConfig);
    }
  }
  return (val) => {
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
