/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dynamicCjsExport } from './dynamic_cjs_export';

describe('dynamicCjsExport', () => {
  it('reads a top-level named export', () => {
    expect(dynamicCjsExport({ Thing: 'value' }, 'Thing')).toBe('value');
  });

  it('falls back to the named export nested under `default`', () => {
    expect(dynamicCjsExport({ default: { Thing: 'value' } }, 'Thing')).toBe('value');
  });

  it('prefers the top-level named export when both are present', () => {
    expect(dynamicCjsExport({ Thing: 'top', default: { Thing: 'nested' } }, 'Thing')).toBe('top');
  });

  it('returns undefined when neither shape has the export', () => {
    expect(dynamicCjsExport({ default: {} }, 'Thing')).toBeUndefined();
  });
});
