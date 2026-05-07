/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import { z as zod } from '@kbn/zod';

import type { TypeOptions } from './interfaces';
import { Type } from './type';

export class BufferType extends Type<Buffer> {
  constructor(options?: TypeOptions<Buffer>) {
    super(
      zod.preprocess(
        (val: unknown) => (typeof val === 'string' ? Buffer.from(val) : val),
        zod.instanceof(Buffer)
      ),
      options
    );
  }

  protected structureTypeLabel(): string {
    return 'binary';
  }

  protected handleError(type: string, { value }: Record<string, any>) {
    if (type === 'any.required' || type === 'invalid_type') {
      return `expected value of type [Buffer] but got [${typeDetect(value)}]`;
    }
  }
}
