/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toHex, isTextToken, isBgToken, isBorderToken } from './color_token_lookup';

describe('toHex', () => {
  it('should return lowercase hex for valid hex input', () => {
    expect(toHex('#FF0000')).toBe('#ff0000');
    expect(toHex('#abc')).toBe('#abc');
  });

  it('should convert rgb() to hex', () => {
    expect(toHex('rgb(255, 0, 0)')).toBe('#ff0000');
    expect(toHex('rgb(0, 128, 255)')).toBe('#0080ff');
  });

  it('should return null for transparent values', () => {
    expect(toHex('transparent')).toBeNull();
    expect(toHex('rgba(0, 0, 0, 0)')).toBeNull();
    expect(toHex('')).toBeNull();
  });

  it('should return null for fully-transparent 8-digit hex', () => {
    expect(toHex('#ff000000')).toBeNull();
  });

  it('should return null for non-color values', () => {
    expect(toHex('inherit')).toBeNull();
    expect(toHex('normal')).toBeNull();
  });
});

describe('token classification', () => {
  it('should classify text tokens', () => {
    expect(isTextToken('text')).toBe(true);
    expect(isTextToken('textParagraph')).toBe(true);
    expect(isTextToken('title')).toBe(true);
    expect(isTextToken('link')).toBe(true);
    expect(isTextToken('primaryText')).toBe(true);
    expect(isTextToken('dangerText')).toBe(true);
  });

  it('should classify background tokens', () => {
    expect(isBgToken('backgroundBasePlain')).toBe(true);
    expect(isBgToken('body')).toBe(true);
    expect(isBgToken('emptyShade')).toBe(true);
    expect(isBgToken('lightestShade')).toBe(true);
  });

  it('should classify border tokens', () => {
    expect(isBorderToken('borderBasePlain')).toBe(true);
  });

  it('should not cross-classify', () => {
    expect(isTextToken('backgroundBasePlain')).toBe(false);
    expect(isBgToken('textParagraph')).toBe(false);
    expect(isBorderToken('text')).toBe(false);
  });
});
