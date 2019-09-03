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
