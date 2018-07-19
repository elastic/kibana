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

import moment from 'moment';

const ratioToSeconds = {
  picoseconds: 0.000000000001,
  nanoseconds: 0.000000001,
  microseconds: 0.000001
};
const HUMAN_FRIENDLY = 'humanize';
const DEFAULT_OUTPUT_PRECISION = 2;
const DEFAULT_INPUT_FORMAT = { text: 'Seconds', kind: 'seconds' };
const inputFormats = [
  { text: 'Picoseconds', kind: 'picoseconds' },
  { text: 'Nanoseconds', kind: 'nanoseconds' },
  { text: 'Microseconds', kind: 'microseconds' },
  { text: 'Milliseconds', kind: 'milliseconds' },
  { ...DEFAULT_INPUT_FORMAT },
  { text: 'Minutes', kind: 'minutes' },
  { text: 'Hours', kind: 'hours' },
  { text: 'Days', kind: 'days' },
  { text: 'Weeks', kind: 'weeks' },
  { text: 'Months', kind: 'months' },
  { text: 'Years', kind: 'years' }
];
const DEFAULT_OUTPUT_FORMAT = { text: 'Human Readable', method: 'humanize' };
const outputFormats = [
  { ...DEFAULT_OUTPUT_FORMAT },
  { text: 'Milliseconds', method: 'asMilliseconds' },
  { text: 'Seconds', method: 'asSeconds' },
  { text: 'Minutes', method: 'asMinutes' },
  { text: 'Hours', method: 'asHours' },
  { text: 'Days', method: 'asDays' },
  { text: 'Weeks', method: 'asWeeks' },
  { text: 'Months', method: 'asMonths' },
  { text: 'Years', method: 'asYears' }
];

function parseInputAsDuration(val, inputFormat) {
  const ratio = ratioToSeconds[inputFormat] || 1;
  const kind = inputFormat in ratioToSeconds ? 'seconds' : inputFormat;
  return moment.duration(val * ratio, kind);
}

export function createDurationFormat(FieldFormat) {
  return class DurationFormat extends FieldFormat {
    isHuman() {
      return this.param('outputFormat') === HUMAN_FRIENDLY;
    }
    getParamDefaults() {
      return {
        inputFormat: DEFAULT_INPUT_FORMAT.kind,
        outputFormat: DEFAULT_OUTPUT_FORMAT.method,
        outputPrecision: DEFAULT_OUTPUT_PRECISION
      };
    }
    _convert(val) {
      const inputFormat = this.param('inputFormat');
      const outputFormat = this.param('outputFormat');
      const outputPrecision = this.param('outputPrecision');
      const human = this.isHuman();
      const prefix = val < 0 && human ? 'minus ' : '';
      const duration = parseInputAsDuration(val, inputFormat);
      const formatted = duration[outputFormat]();
      const precise = human ? formatted : formatted.toFixed(outputPrecision);
      return prefix + precise;
    }

    static id = 'duration';
    static title = 'Duration';
    static fieldType = 'number';

    static inputFormats = inputFormats;
    static outputFormats = outputFormats;
  };
}
