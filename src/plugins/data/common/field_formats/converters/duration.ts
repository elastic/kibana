/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    shortText: i18n.translate('data.fieldFormats.duration.outputFormats.asMilliseconds.short', {
      defaultMessage: 'ms',
    }),
    method: 'asMilliseconds',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asSeconds', {
      defaultMessage: 'Seconds',
    }),
    shortText: i18n.translate('data.fieldFormats.duration.outputFormats.asSeconds.short', {
      defaultMessage: 'sec',
    }),
    method: 'asSeconds',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asMinutes', {
      defaultMessage: 'Minutes',
    }),
    shortText: i18n.translate('data.fieldFormats.duration.outputFormats.asMinutes.short', {
      defaultMessage: 'min',
    }),
    method: 'asMinutes',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asHours', {
      defaultMessage: 'Hours',
    }),
    shortText: i18n.translate('data.fieldFormats.duration.outputFormats.asHours.short', {
      defaultMessage: 'hr',
    }),
    method: 'asHours',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asDays', {
      defaultMessage: 'Days',
    }),
    shortText: i18n.translate('data.fieldFormats.duration.outputFormats.asDays.short', {
      defaultMessage: 'd',
    }),
    method: 'asDays',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asWeeks', {
      defaultMessage: 'Weeks',
    }),
    shortText: i18n.translate('data.fieldFormats.duration.outputFormats.asWeeks.short', {
      defaultMessage: 'w',
    }),
    method: 'asWeeks',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asMonths', {
      defaultMessage: 'Months',
    }),
    shortText: i18n.translate('data.fieldFormats.duration.outputFormats.asMonths.short', {
      defaultMessage: 'mon',
    }),
    method: 'asMonths',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.asYears', {
      defaultMessage: 'Years',
    }),
    shortText: i18n.translate('data.fieldFormats.duration.outputFormats.asYears.short', {
      defaultMessage: 'Yr',
    }),
    method: 'asYears',
  },
  {
    text: i18n.translate('data.fieldFormats.duration.outputFormats.dynamic', {
      defaultMessage: 'Dynamic',
    }),
    method: 'dynamic',
  },
];

function parseInputAsDuration(val: number, inputFormat: string) {
  const ratio = ratioToSeconds[inputFormat] || 1;
  const kind = (inputFormat in ratioToSeconds
    ? 'seconds'
    : inputFormat) as unitOfTime.DurationConstructor;
  return moment.duration(val * ratio, kind);
}

function formatInputDynamically(
  val: number,
  inputFormat: string,
  outputPrecision: number,
  showSuffix: boolean,
  useShortSuffix: boolean
) {
  const ratio = ratioToSeconds[inputFormat] || 1;
  const kind = (inputFormat in ratioToSeconds
    ? 'seconds'
    : inputFormat) as unitOfTime.DurationConstructor;
  const valueInDuration = moment.duration(val * ratio, kind);

  return formatDuration(valueInDuration, outputPrecision, showSuffix, useShortSuffix);
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

  isDynamic() {
    return this.param('outputFormat') === 'dynamic';
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
    const useShortSuffix = Boolean(this.param('useShortSuffix'));
    const human = this.isHuman();
    const dyanmic = this.isDynamic();
    const prefix =
      val < 0 && human
        ? i18n.translate('data.fieldFormats.duration.negativeLabel', {
            defaultMessage: 'minus',
          }) + ' '
        : '';
    const duration = parseInputAsDuration(val, inputFormat) as Record<keyof Duration, Function>;
    const formatted = dyanmic
      ? formatInputDynamically(val, inputFormat, outputPrecision, showSuffix, useShortSuffix)
      : duration[outputFormat]();
    const precise = human || dyanmic ? formatted : formatted.toFixed(outputPrecision);
    const type = outputFormats.find(({ method }) => method === outputFormat);

    const unitText = useShortSuffix ? type?.shortText : type?.text;

    const suffix = showSuffix && unitText ? ` ${unitText}` : '';

    return dyanmic ? precise : prefix + precise + suffix;
  };
}

function formatDuration(
  duration: moment.Duration,
  outputPrecision: number,
  showSuffix: boolean,
  useShortSuffix: boolean
) {
  const parts = [];
  // const duration = moment.duration(period);

  // return nothing when the duration is falsy or not correctly parsed (P0D)
  if (!duration || duration.toISOString() === 'P0D') return;

  const units = [
    { unit: duration.years(), nextUnitRate: 12, method: 'asYears' },
    { unit: duration.months(), nextUnitRate: 4, method: 'asMonths' },
    { unit: duration.weeks(), nextUnitRate: 7, method: 'asWeeks' },
    { unit: duration.days(), nextUnitRate: 24, method: 'asDays' },
    { unit: duration.hours(), nextUnitRate: 60, method: 'asHours' },
    { unit: duration.minutes(), nextUnitRate: 60, method: 'asMinutes' },
    { unit: duration.seconds(), nextUnitRate: 1000, method: 'asSeconds' },
    { unit: duration.milliseconds(), nextUnitRate: 1000, method: 'asMilliseconds' },
  ];

  for (let i = 0; i < units.length; i++) {
    const unitValue = units[i].unit;
    if (unitValue >= 1) {
      const type = outputFormats.find(({ method }) => method === units[i].method);
      const unitText = showSuffix ? (useShortSuffix ? type?.shortText : type?.text) : '';

      const value = Math.floor(unitValue);
      if (units?.[i + 1]) {
        const decimalPointValue = Math.floor(units[i + 1].unit);
        parts.push(
          (value + decimalPointValue / units[i].nextUnitRate).toFixed(outputPrecision) +
            ' ' +
            unitText
        );
        return parts.join(', ');
      } else {
        parts.push(value + ' ' + unitText);
        return parts.join(', ');
      }
    }
  }

  return 0;
}
