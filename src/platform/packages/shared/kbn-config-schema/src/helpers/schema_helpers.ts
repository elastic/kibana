/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StringOptions } from '../types/string_type';
import { StringType } from '../types/string_type';
import type { Type } from '../types/type';
import { getReporter } from './violation_reporter';

export type { SchemaViolationReporter } from './violation_reporter';
export { registerSchemaViolationReporter } from './violation_reporter';

// ---------------------------------------------------------------------------
// Helper factory
// ---------------------------------------------------------------------------

type WarnOverrides = Omit<StringOptions, 'validate' | 'maxLength'> & { label?: string };

export interface SchemaHelper {
  (overrides?: StringOptions): Type<string>;
  warn(overrides?: WarnOverrides): Type<string>;
}

function makeHelper(name: string, defaults: StringOptions): SchemaHelper {
  const fn = (overrides?: StringOptions): Type<string> =>
    new StringType({ ...defaults, ...overrides });

  fn.warn = ({ label, ...overrides }: WarnOverrides = {}): Type<string> =>
    new StringType({
      ...defaults,
      ...overrides,
      maxLength: undefined,
      validate: (value: string) => {
        if (defaults.maxLength !== undefined && value.length > defaults.maxLength) {
          getReporter().report({
            helper: name,
            length: value.length,
            maxLength: defaults.maxLength,
            label,
          });
        }
      },
    });

  return fn as SchemaHelper;
}

// ---------------------------------------------------------------------------
// Named string helpers
// ---------------------------------------------------------------------------

export const savedObjectId = makeHelper('savedObjectId', { minLength: 1, maxLength: 512 });
export const spaceId = makeHelper('spaceId', { minLength: 1, maxLength: 512 });
export const displayName = makeHelper('displayName', { minLength: 1, maxLength: 1024 });
export const description = makeHelper('description', { maxLength: 10000 });
export const searchFilter = makeHelper('searchFilter', { maxLength: 10000 });
export const aggregation = makeHelper('aggregation', { maxLength: 100000 });

// ---------------------------------------------------------------------------
// Unbounded string escape hatch
// ---------------------------------------------------------------------------

type UnboundedStringOptions = Omit<StringOptions, 'maxLength'> & { reason: string };

export function unboundedString({ reason, ...rest }: UnboundedStringOptions): Type<string> {
  if (!reason || reason.trim() === '') {
    throw new Error(
      'schema.unboundedString() requires a non-empty reason explaining why no maxLength is set'
    );
  }
  return new StringType(rest);
}
