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
