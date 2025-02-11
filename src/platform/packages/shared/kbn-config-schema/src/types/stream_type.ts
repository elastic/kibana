/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import { Stream } from 'stream';
import { internals } from '../internals';
import { Type, TypeOptions } from './type';

export class StreamType extends Type<Stream> {
  constructor(options?: TypeOptions<Stream>) {
    super(internals.stream(), options);
  }

  protected handleError(type: string, { value }: Record<string, any>) {
    if (type === 'any.required' || type === 'stream.base') {
      return `expected value of type [Stream] but got [${typeDetect(value)}]`;
    }
  }
}
