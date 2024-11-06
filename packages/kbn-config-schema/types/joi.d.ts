/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Joi from 'joi';
import type { ByteSizeValue } from '../src/byte_size_value';
import type { DurationValueType } from '../src/types/duration_type';

declare module 'joi' {
  interface BytesSchema extends AnySchema {
    min(limit: number | string | ByteSizeValue): this;

    max(limit: number | string | ByteSizeValue): this;
  }

  interface DurationSchema extends AnySchema {
    min(limit: DurationValueType): this;

    max(limit: DurationValueType): this;
  }

  interface MapSchema extends AnySchema {
    entries(key: AnySchema, value: AnySchema): this;
  }

  interface RecordSchema extends AnySchema {
    entries(key: AnySchema, value: AnySchema): this;
  }

  interface ErrorReport {
    // missing from the typedef
    // see https://github.com/sideway/joi/blob/master/lib/errors.js
    local?: Record<string, any>;

    toString(): string;
  }

  export type JoiRoot = Joi.Root & {
    bytes: () => BytesSchema;
    duration: () => DurationSchema;
    map: () => MapSchema;
    record: () => RecordSchema;
    stream: () => AnySchema;
  };
}
