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

import numeral from '@elastic/numeral';
import handlebars from 'handlebars/dist/handlebars';
import { durationInputOptions } from './durations';
import { capitalize, isNumber } from 'lodash';

import { createDurationFormat } from '../../../../kibana/common/field_formats/types/duration';
import { FieldFormat } from '../../../../../ui/field_formats/field_format';

const DurationFormat = createDurationFormat(FieldFormat);

const formatLookup = {
  'bytes': '0.0b',
  'number': '0,0.[00]',
  'percent': '0.[00]%'
};

const durationsLookup = durationInputOptions.reduce((acc, row) => {
  acc[row.value] = row.label;
  return acc;
}, {});

export default (format = '0,0.[00]', template) => {
  if (!template) template = '{{value}}';
  const render = handlebars.compile(template);
  const durationFormatTest = /[pnumshdwMY]+,[pnumshdwMY]+,\d+/;
  return (val) => {
    const formatString = formatLookup[format] || format;
    let value;
    if (!isNumber(val)) {
      value = 0;
    } else {
      if (durationFormatTest.test(format)) {
        const [from, to, decimals] = format.split(',');
        const inputFormat = durationsLookup[from];
        const outputFormat = `as${capitalize(durationsLookup[to])}`;
        const formatter = new DurationFormat({
          inputFormat,
          outputFormat,
          outputPrecision: decimals
        });
        value = formatter.convert(val, 'text');
      } else {
        try {
          value = numeral(val).format(formatString);
        } catch (e) {
          value = val;
        }
      }
    }
    try {
      return render({ value });
    } catch (e) {
      return String(value);
    }
  };
};
