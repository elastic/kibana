/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import type { Duration } from '../duration';
import { ensureDuration } from '../duration';
import { SchemaTypeError } from '../errors';
import { internals } from '../internals';
import { Type, type DefaultValue } from './type';
import type { Reference } from '../references';

// we need to special-case defaultValue as we want to handle string inputs too
export type DurationValueType = Duration | string | number;

export type DurationDefaultValue =
  | DurationValueType
  | (() => DurationValueType)
  | Reference<Duration>; // references must only be a Duration

export interface DurationOptions<D extends DurationDefaultValue> {
  defaultValue?: D;
  validate?: (value: Duration) => string | void;
  min?: DurationValueType;
  max?: DurationValueType;
}

export class DurationType<D extends DurationDefaultValue> extends Type<
  Duration,
  [D] extends [never] ? never : Duration
> {
  constructor(options: DurationOptions<D> = {}) {
    let defaultValue: DefaultValue<Duration> | undefined;

    const originalDefaultValue = options.defaultValue;

    if (typeof originalDefaultValue === 'function') {
      defaultValue = () => ensureDuration(originalDefaultValue());
    } else if (
      typeof originalDefaultValue === 'string' ||
      typeof originalDefaultValue === 'number'
    ) {
      defaultValue = ensureDuration(originalDefaultValue);
    } else {
      defaultValue = originalDefaultValue;
    }

    let schema = internals.duration();
    if (options.min) {
      schema = schema.min(options.min);
    }
    if (options.max) {
      schema = schema.max(options.max);
    }

    super(schema, {
      validate: options.validate,
      defaultValue: defaultValue as [D] extends [never] ? never : Duration,
    });
  }

  protected handleError(
    type: string,
    { message, value, limit }: Record<string, any>,
    path: string[]
  ) {
    switch (type) {
      case 'any.required':
      case 'duration.base':
        return `expected value of type [moment.Duration] but got [${typeDetect(value)}]`;
      case 'duration.parse':
        return new SchemaTypeError(message, path);
      case 'duration.min':
        return `Value must be equal to or greater than [${limit.toString()}]`;
      case 'duration.max':
        return `Value must be equal to or less than [${limit.toString()}]`;
    }
  }
}
