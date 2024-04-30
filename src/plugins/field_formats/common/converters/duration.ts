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

function parseInputAsDuration(val: number, inputFormat: string, humanPrecise: boolean) {
  const ratio = ratioToSeconds[inputFormat] || 1;
  const kind = (
    inputFormat in ratioToSeconds ? 'seconds' : inputFormat
  ) as unitOfTime.DurationConstructor;
  const value = humanPrecise && val < 0 ? Math.abs(val * ratio) : val * ratio;
  return moment.duration(value, kind);
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

    const duration = parseInputAsDuration(val, inputFormat, humanPrecise);
    const formatted = humanPrecise
      ? formatDurationHumanPrecise(duration, outputPrecision, useShortSuffix, includeSpace, val < 0)
      : (duration[outputFormat] as Function)();

    const precise = human || humanPrecise ? formatted : Number(formatted).toFixed(outputPrecision);
    const type = DURATION_OUTPUT_FORMATS.find(({ method }) => method === outputFormat);

    const unitText = useShortSuffix ? type?.shortText : type?.text.toLowerCase();

    const suffix = showSuffix && unitText && !human ? `${includeSpace}${unitText}` : '';

    return humanPrecise ? precise : prefix + precise + suffix;
  };
}

// Array of units is to find the first unit duration value that is not 0
const units = [
  { seconds: 31536000, method: 'asYears' },
  // Note: 30 days is used as a month in the duration format
  { seconds: 2592000, method: 'asMonths' },
  { seconds: 604800, method: 'asWeeks' },
  { seconds: 86400, method: 'asDays' },
  { seconds: 3600, method: 'asHours' },
  { seconds: 60, method: 'asMinutes' },
  { seconds: 1, method: 'asSeconds' },
  { seconds: 0.001, method: 'asMilliseconds' },
];

function formatDurationHumanPrecise(
  duration: moment.Duration,
  outputPrecision: number,
  useShortSuffix: boolean,
  includeSpace: string,
  negativeValue: boolean
) {
  // return nothing when the duration is falsy or not correctly parsed (P0D)
  if (!duration || !duration.isValid()) return;
  const valueInSeconds = duration.as('seconds');

  const getUnitText = (method: string) => {
    const type = DURATION_OUTPUT_FORMATS.find(({ method: methodT }) => method === methodT);
    return useShortSuffix ? type?.shortText : type?.text.toLowerCase();
  };

  for (const unit of units) {
    const unitValue = valueInSeconds / unit.seconds;
    if (unitValue >= 1 || unit === units[units.length - 1]) {
      // return a value if it's the first iteration where the value > 1, or the last iteration
      const prefix = negativeValue ? '-' : '';
      return prefix + unitValue.toFixed(outputPrecision) + includeSpace + getUnitText(unit.method);
    }
  }
}
