/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDocInputIdValue } from './documents_nav_preview';

describe('getDocInputIdValue', () => {
  it('returns customId if customId is an empty string', () => {
    expect(getDocInputIdValue('', 'doc-123')).toBe('');
  });

  it('returns customId if customId is a non-empty string', () => {
    expect(getDocInputIdValue('custom-456', 'doc-123')).toBe('custom-456');
  });

  it('returns documentId if customId is undefined', () => {
    expect(getDocInputIdValue(undefined, 'doc-123')).toBe('doc-123');
  });

  it('returns empty string if both customId and documentId are undefined', () => {
    expect(getDocInputIdValue(undefined, undefined)).toBe('');
  });
});
