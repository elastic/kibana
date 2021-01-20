/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import typeDetect from 'type-detect';
import { Duration, ensureDuration } from '../duration';
import { SchemaTypeError } from '../errors';
import { internals } from '../internals';
import { Reference } from '../references';
import { Type } from './type';

type DurationValueType = Duration | string | number;

export interface DurationOptions {
  // we need to special-case defaultValue as we want to handle string inputs too
  defaultValue?: DurationValueType | Reference<DurationValueType> | (() => DurationValueType);
  validate?: (value: Duration) => string | void;
}

export class DurationType extends Type<Duration> {
  constructor(options: DurationOptions = {}) {
    let defaultValue;
    if (typeof options.defaultValue === 'function') {
      const originalDefaultValue = options.defaultValue;
      defaultValue = () => ensureDuration(originalDefaultValue());
    } else if (
      typeof options.defaultValue === 'string' ||
      typeof options.defaultValue === 'number'
    ) {
      defaultValue = ensureDuration(options.defaultValue);
    } else {
      defaultValue = options.defaultValue;
    }

    super(internals.duration(), { ...options, defaultValue });
  }

  protected handleError(type: string, { message, value }: Record<string, any>, path: string[]) {
    switch (type) {
      case 'any.required':
      case 'duration.base':
        return `expected value of type [moment.Duration] but got [${typeDetect(value)}]`;
      case 'duration.parse':
        return new SchemaTypeError(message, path);
    }
  }
}
