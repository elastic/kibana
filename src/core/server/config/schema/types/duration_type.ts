import { duration as momentDuration, Duration, isDuration } from 'moment';
import typeDetect from 'type-detect';
import { Type } from './type';
import { SchemaTypeError } from '../errors';

export type DurationOptions = {
  // we need to special-case defaultValue as we want to handle string inputs too
  validate?: (value: Duration) => string | void;
  defaultValue?: Duration | string | number;
};

function ensureDuration(value?: Duration | string | number) {
  if (typeof value === 'string') {
    return stringToDuration(value);
  }

  if (typeof value === 'number') {
    return numberToDuration(value);
  }

  return value;
}

const timeFormatRegex = /^(0|[1-9][0-9]*)(ms|s|m|h|d|w|M|Y)$/;

function stringToDuration(text: string) {
  const result = timeFormatRegex.exec(text);
  if (!result) {
    throw new Error(
      `Failed to parse [${text}] as time value. ` +
      `Format must be <count>[ms|s|m|h|d|w|M|Y] (e.g. '70ms', '5s', '3d', '1Y')`
    );
  }

  const count = parseInt(result[1]);
  const unit = result[2] as any;

  return momentDuration(count, unit);
}

function numberToDuration(numberMs: number) {
  if (!Number.isSafeInteger(numberMs) || numberMs < 0) {
    throw new Error(
      `Failed to parse [${numberMs}] as time value. ` +
      `Value should be a safe positive integer number.`
    );
  }

  return momentDuration(numberMs);
}

export class DurationType extends Type<Duration> {
  constructor(options: DurationOptions = {}) {
    const { defaultValue, ...rest } = options;

    super({
      ...rest,
      defaultValue: ensureDuration(defaultValue),
    });
  }

  process(value: any, context?: string): Duration {
    if (typeof value === 'string') {
      value = stringToDuration(value);
    }

    if (typeof value === 'number') {
      value = numberToDuration(value);
    }

    if (!isDuration(value)) {
      throw new SchemaTypeError(
        `expected value of type [moment.Duration] but got [${typeDetect(
          value
        )}]`,
        context
      );
    }

    return value;
  }
}
