/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter } from '@elastic/esql';
import { esqlColumn } from './esql_column';

const print = (field: string): string => BasicPrettyPrinter.print(esqlColumn(field));

describe('esqlColumn', () => {
  it('builds a reference from a single-segment name', () => {
    expect(print('message')).toBe('message');
  });

  it('leaves a dotted name unquoted when no segment needs quoting', () => {
    expect(print('error.culprit')).toBe('error.culprit');
  });

  it('quotes only the segment that needs it, not the whole name', () => {
    expect(print('labels.some-tag.value')).toBe('labels.`some-tag`.value');
  });

  it('leaves an @-prefixed name alone', () => {
    expect(print('@timestamp')).toBe('@timestamp');
  });

  it('prints an empty quoted segment, so callers must pass a validated field name', () => {
    expect(print('')).toBe('``');
  });
});
