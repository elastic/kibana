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

import { i18n } from '@kbn/i18n';
import moment, { unitOfTime, Duration } from 'moment';
import { KBN_FIELD_TYPES } from '../../kbn_field_types/types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS } from '../types';

const ratioToSeconds: Record<string, number> = {
  picoseconds: 0.000000000001,
  nanoseconds: 0.000000001,
  microseconds: 0.000001,
};
const HUMAN_FRIENDLY = 'humanize';
const DEFAULT_OUTPUT_PRECISION = 2;
const DEFAULT_INPUT_FORMAT = {
  text: i18n.translate('data.fieldFormats.duration.inputFormats.seconds', {
    defaultMessage: 'Seconds',
  }),
  kind: 'seconds',
};
const inputFormats = [
  {
    text: i18n.translate('data.fieldFormats.duration.inputFormats.picoseconds', {
      defaultMessage: 'Picoseconds',
    }),
    kind: 'picoseconds',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.inputFormats.nanoseconds', {
      defaultMessage: 'Nanoseconds',
    }),
    kind: 'nanoseconds',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.inputFormats.microseconds', {
      defaultMessage: 'Microseconds',
    }),
    kind: 'microseconds',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.inputFormats.milliseconds', {
      defaultMessage: 'Milliseconds',
    }),
    kind: 'milliseconds',
  },
  { ...DEFAULT_INPUT_FORMAT },
  {
    text: i18n.translate('data.fieldFormats.duration.inputFormats.minutes', {
      defaultMessage: 'Minutes',
    }),
    kind: 'minutes',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.inputFormats.hours', {
      defaultMessage: 'Hours',
    }),
    kind: 'hours',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.inputFormats.days', {
      defaultMessage: 'Days',
    }),
    kind: 'days',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.inputFormats.weeks', {
      defaultMessage: 'Weeks',
    }),
    kind: 'weeks',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.inputFormats.months', {
      defaultMessage: 'Months',
    }),
    kind: 'months',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.inputFormats.years', {
      defaultMessage: 'Years',
    }),
    kind: 'years',
  },
];
const DEFAULT_OUTPUT_FORMAT = {
  text: i18n.translate('data.fieldFormats.duration.outputFormats.humanize', {
    defaultMessage: 'Human Readable',
  }),
  method: 'humanize',
};
const outputFormats = [
  { ...DEFAULT_OUTPUT_FORMAT },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asMilliseconds', {
      defaultMessage: 'Milliseconds',
    }),
    method: 'asMilliseconds',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asSeconds', {
      defaultMessage: 'Seconds',
    }),
    method: 'asSeconds',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asMinutes', {
      defaultMessage: 'Minutes',
    }),
    method: 'asMinutes',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asHours', {
      defaultMessage: 'Hours',
    }),
    method: 'asHours',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asDays', {
      defaultMessage: 'Days',
    }),
    method: 'asDays',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asWeeks', {
      defaultMessage: 'Weeks',
    }),
    method: 'asWeeks',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asMonths', {
      defaultMessage: 'Months',
    }),
    method: 'asMonths',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asYears', {
      defaultMessage: 'Years',
    }),
    method: 'asYears',
  },
];

function parseInputAsDuration(val: number, inputFormat: string) {
  const ratio = ratioToSeconds[inputFormat] || 1;
  const kind = (inputFormat in ratioToSeconds
    ? 'seconds'
    : inputFormat) as unitOfTime.DurationConstructor;
  return moment.duration(val * ratio, kind);
}

export class DurationFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.DURATION;
  static title = i18n.translate('data.fieldFormats.duration.title', {
    defaultMessage: 'Duration',
  });
  static fieldType = KBN_FIELD_TYPES.NUMBER;
  static inputFormats = inputFormats;
  static outputFormats = outputFormats;
  allowsNumericalAggregations = true;

  isHuman() {
    return this.param('outputFormat') === HUMAN_FRIENDLY;
  }
  getParamDefaults() {
    return {
      inputFormat: DEFAULT_INPUT_FORMAT.kind,
      outputFormat: DEFAULT_OUTPUT_FORMAT.method,
      outputPrecision: DEFAULT_OUTPUT_PRECISION,
    };
  }

  textConvert: TextContextTypeConvert = (val) => {
    const inputFormat = this.param('inputFormat');
    const outputFormat = this.param('outputFormat') as keyof Duration;
    const outputPrecision = this.param('outputPrecision');
    const showSuffix = Boolean(this.param('showSuffix'));
    const human = this.isHuman();
    const prefix =
      val < 0 && human
        ? i18n.translate('data.fieldFormats.duration.negativeLabel', {
            defaultMessage: 'minus',
          }) + ' '
        : '';
    const duration = parseInputAsDuration(val, inputFormat) as Record<keyof Duration, Function>;
    const formatted = duration[outputFormat]();
    const precise = human ? formatted : formatted.toFixed(outputPrecision);
    const type = outputFormats.find(({ method }) => method === outputFormat);
    const suffix = showSuffix && type ? ` ${type.text}` : '';

    return prefix + precise + suffix;
  };
}
