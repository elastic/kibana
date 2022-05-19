/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { acceptCompression } from './accept_compression';

describe('acceptCompression', () => {
  it('should return false for empty headers', () => {
    expect(acceptCompression({})).toBe(false);
  });
  it('should return false for other header containing gzip as string', () => {
    expect(acceptCompression({ 'other-header': 'gzip, other' })).toBe(false);
  });
  it('should return false for other header containing gzip as array', () => {
    expect(acceptCompression({ 'other-header': ['gzip', 'other'] })).toBe(false);
  });
  it('should return true for upper-case header containing gzip as string', () => {
    expect(acceptCompression({ 'Accept-Encoding': 'gzip, other' })).toBe(true);
  });
  it('should return true for lower-case header containing gzip as string', () => {
    expect(acceptCompression({ 'accept-encoding': 'gzip, other' })).toBe(true);
  });
  it('should return true for upper-case header containing gzip as array', () => {
    expect(acceptCompression({ 'Accept-Encoding': ['gzip', 'other'] })).toBe(true);
  });
  it('should return true for lower-case header containing gzip as array', () => {
    expect(acceptCompression({ 'accept-encoding': ['gzip', 'other'] })).toBe(true);
  });
  it('should return true for mixed headers containing gzip as string', () => {
    expect(
      acceptCompression({ 'accept-encoding': 'gzip, other', 'other-header': 'other-value' })
    ).toBe(true);
  });
  it('should return true for mixed headers containing gzip as array', () => {
    expect(
      acceptCompression({ 'accept-encoding': ['gzip', 'other'], 'other-header': 'other-value' })
    ).toBe(true);
  });
});
