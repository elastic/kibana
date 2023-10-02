/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import moment, { unitOfTime, Duration } from 'moment';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS } from '../types';
import {
  DEFAULT_DURATION_INPUT_FORMAT,
  DEFAULT_DURATION_OUTPUT_FORMAT,
  DURATION_INPUT_FORMATS,
  DURATION_OUTPUT_FORMATS,
} from '../constants/duration_formats';

const ratioToSeconds: Record<string, number> = {
  picoseconds: 0.000000000001,
  nanoseconds: 0.000000001,
  microseconds: 0.000001,
};

const HUMAN_FRIENDLY = 'humanize';
const HUMAN_FRIENDLY_PRECISE = 'humanizePrecise';
const DEFAULT_OUTPUT_PRECISION = 2;

function parseInputAsDuration(val: number, inputFormat: string) {
  const ratio = ratioToSeconds[inputFormat] || 1;
  const kind = (
    inputFormat in ratioToSeconds ? 'seconds' : inputFormat
  ) as unitOfTime.DurationConstructor;
  return moment.duration(val * ratio, kind);
}

function formatInputHumanPrecise(
  val: number,
  inputFormat: string,
  outputPrecision: number,
  useShortSuffix: boolean,
  includeSpace: string
) {
  const ratio = ratioToSeconds[inputFormat] || 1;
  const kind = (
    inputFormat in ratioToSeconds ? 'seconds' : inputFormat
  ) as unitOfTime.DurationConstructor;
  const valueInDuration = moment.duration(val * ratio, kind);

  return formatDuration(
    val,
    valueInDuration,
    inputFormat,
    outputPrecision,
    useShortSuffix,
    includeSpace
  );
}

export class DurationFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.DURATION;
  static title = i18n.translate('fieldFormats.duration.title', {
    defaultMessage: 'Duration',
  });
  static fieldType = KBN_FIELD_TYPES.NUMBER;
  static inputFormats = DURATION_INPUT_FORMATS;
  static outputFormats = DURATION_OUTPUT_FORMATS;
  allowsNumericalAggregations = true;

  isHuman() {
    return this.param('outputFormat') === HUMAN_FRIENDLY;
  }

  isHumanPrecise() {
    return this.param('outputFormat') === HUMAN_FRIENDLY_PRECISE;
  }

  getParamDefaults() {
    return {
      inputFormat: DEFAULT_DURATION_INPUT_FORMAT.kind,
      outputFormat: DEFAULT_DURATION_OUTPUT_FORMAT.method,
      outputPrecision: DEFAULT_OUTPUT_PRECISION,
      includeSpaceWithSuffix: true,
    };
  }

  textConvert: TextContextTypeConvert = (val: number) => {
    const inputFormat = this.param('inputFormat');
    const outputFormat = this.param('outputFormat') as keyof Duration;
    const outputPrecision = this.param('outputPrecision');
    const showSuffix = Boolean(this.param('showSuffix'));
    const useShortSuffix = Boolean(this.param('useShortSuffix'));
    const includeSpaceWithSuffix = this.param('includeSpaceWithSuffix');

    const includeSpace = includeSpaceWithSuffix ? ' ' : '';

    const human = this.isHuman();
    const humanPrecise = this.isHumanPrecise();

    if (human && val === 0) {
      return i18n.translate('fieldFormats.duration.zeroSecondsLabel', {
        defaultMessage: '0 seconds',
      }); // Handle the case of 0 value for "Human Friendly"
    }

    const prefix =
      val < 0 && human
        ? i18n.translate('fieldFormats.duration.negativeLabel', {
            defaultMessage: 'minus',
          }) + ' '
        : '';

    const duration = parseInputAsDuration(val, inputFormat) as Record<keyof Duration, Function>;
    const formatted = humanPrecise
      ? formatInputHumanPrecise(val, inputFormat, outputPrecision, useShortSuffix, includeSpace)
      : duration[outputFormat]();

    const precise = human || humanPrecise ? formatted : formatted.toFixed(outputPrecision);
    const type = DURATION_OUTPUT_FORMATS.find(({ method }) => method === outputFormat);

    const unitText = useShortSuffix ? type?.shortText : type?.text.toLowerCase();

    const suffix = showSuffix && unitText && !human ? `${includeSpace}${unitText}` : '';

    return humanPrecise ? precise : prefix + precise + suffix;
  };
}

function formatDuration(
  val: number,
  duration: moment.Duration,
  inputFormat: string,
  outputPrecision: number,
  useShortSuffix: boolean,
  includeSpace: string
) {
  // return nothing when the duration is falsy or not correctly parsed (P0D)
  if (!duration || !duration.isValid()) return;
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

  const getUnitText = (method: string) => {
    const type = DURATION_OUTPUT_FORMATS.find(({ method: methodT }) => method === methodT);
    return useShortSuffix ? type?.shortText : type?.text.toLowerCase();
  };

  for (let i = 0; i < units.length; i++) {
    const unitValue = units[i].unit;
    if (unitValue >= 1) {
      const unitText = getUnitText(units[i].method);

      const value = Math.floor(unitValue);
      if (units?.[i + 1]) {
        const decimalPointValue = Math.floor(units[i + 1].unit);
        return (
          (value + decimalPointValue / units[i].nextUnitRate).toFixed(outputPrecision) +
          includeSpace +
          unitText
        );
      } else {
        return unitValue.toFixed(outputPrecision) + includeSpace + unitText;
      }
    }
  }

  const unitValue = units[units.length - 1].unit;
  const unitText = getUnitText(units[units.length - 1].method);

  return unitValue.toFixed(outputPrecision) + includeSpace + unitText;
}
