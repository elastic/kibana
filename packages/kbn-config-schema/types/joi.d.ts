/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as Joi from 'joi';
import { ByteSizeValue } from '../src/byte_size_value';

declare module 'joi' {
  interface BytesSchema extends AnySchema {
    min(limit: number | string | ByteSizeValue): this;
    max(limit: number | string | ByteSizeValue): this;
  }

  interface MapSchema extends AnySchema {
    entries(key: AnySchema, value: AnySchema): this;
  }

  interface RecordSchema extends AnySchema {
    entries(key: AnySchema, value: AnySchema): this;
  }

  export type JoiRoot = Joi.Root & {
    bytes: () => BytesSchema;
    duration: () => AnySchema;
    map: () => MapSchema;
    record: () => RecordSchema;
    stream: () => AnySchema;
  };

  interface AnySchema {
    custom(validator: (value: any) => string | void): this;
  }

  // Joi types don't include `schema` function even though it's supported.
  interface ObjectSchema {
    schema(): this;
  }
}
