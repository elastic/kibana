/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import type { z } from '@kbn/zod';
import { z as zod } from '@kbn/zod';

import { getValidationFrame } from '../validation_frame';

const REF_BRAND = Symbol.for('@kbn/config-schema/Reference');

export class Reference<T> {
  public readonly [REF_BRAND] = true;

  public static isReference<V>(value: V | Reference<V> | undefined): value is Reference<V> {
    return Boolean(
      value && typeof value === 'object' && (value as Reference<V>)[REF_BRAND] === true
    );
  }

  constructor(public readonly path: string, public readonly kind: 'context' | 'sibling') {}

  public getSchema(): z.ZodTypeAny {
    return zod.any();
  }

  public resolve(): unknown {
    const frame = getValidationFrame();
    if (!frame) {
      return undefined;
    }
    if (this.kind === 'context') {
      return frame.context[this.path];
    }
    return get(frame.siblingRoot, this.path);
  }
}
