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
    valueInDuration.as('seconds'),
    valueInDuration,
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

// function to calculate the precision part of the value
const calculatePrecision = (rawValue: number, unitValue: number, seconds: number) => {
  return Math.floor(unitValue) + (rawValue - unitValue * seconds) / seconds;
};

// Array of units is to find the first unit duration value that is not 0
const units = [
  { getValue: (dur: moment.Duration) => dur.years(), seconds: 31536000, method: 'asYears' },
  // Note: 31 days is used as a month in the duration format
  { getValue: (dur: moment.Duration) => dur.months(), seconds: 2678400, method: 'asMonths' },
  { getValue: (dur: moment.Duration) => dur.weeks(), seconds: 604800, method: 'asWeeks' },
  { getValue: (dur: moment.Duration) => dur.days(), seconds: 86400, method: 'asDays' },
  { getValue: (dur: moment.Duration) => dur.hours(), seconds: 3600, method: 'asHours' },
  { getValue: (dur: moment.Duration) => dur.minutes(), seconds: 60, method: 'asMinutes' },
  { getValue: (dur: moment.Duration) => dur.seconds(), method: 'asSeconds' },
  { getValue: (dur: moment.Duration) => dur.milliseconds(), method: 'asMilliseconds' },
];

function formatDuration(
  rawValue: number,
  duration: moment.Duration,
  outputPrecision: number,
  useShortSuffix: boolean,
  includeSpace: string
) {
  // return nothing when the duration is falsy or not correctly parsed (P0D)
  if (!duration || !duration.isValid()) return;

  const getUnitText = (method: string) => {
    const type = DURATION_OUTPUT_FORMATS.find(({ method: methodT }) => method === methodT);
    return useShortSuffix ? type?.shortText : type?.text.toLowerCase();
  };

  for (const unit of units) {
    // this is the formatted duration value of the unit
    const unitValue = unit.getValue(duration);
    if (unitValue >= 1 || unit === units[units.length - 1]) {
      // return a value if it's the first iteration where the value > 1, or the last iteration
      // calculate the fractional part of the value based on conversion to seconds
      // So when 1 year is given as unit value and the raw value in seconds is more than that
      // the overflow in seconds is used to calculate fractional part of the returned value
      const finalValue = unit.seconds
        ? calculatePrecision(rawValue, unitValue, unit.seconds)
        : unitValue;
      return finalValue.toFixed(outputPrecision) + includeSpace + getUnitText(unit.method);
    }
  }
}
