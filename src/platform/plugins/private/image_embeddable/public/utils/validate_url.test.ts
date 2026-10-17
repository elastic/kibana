/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IExternalUrl } from '@kbn/core-http-browser';
import { MAX_IMAGE_URL_LENGTH } from '../../common';
import { createValidateUrl } from './validate_url';

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';

describe('createValidateUrl', () => {
  const externalUrl = { validateUrl: jest.fn((url: string) => url) } as unknown as IExternalUrl;
  const validateUrl = createValidateUrl(externalUrl);

  beforeEach(() => jest.clearAllMocks());

  it('accepts https URLs', () => {
    expect(validateUrl('https://elastic.co/image.png').isValid).toBe(true);
  });

  it('rejects javascript URLs', () => {
    expect(validateUrl(`${'javascript'}:alert(1)`).isValid).toBe(false);
  });

  it.each(['png', 'jpeg', 'jpg', 'gif', 'webp'])('accepts base64 %s data URLs', (type) => {
    expect(validateUrl(PNG.replace('png', type)).isValid).toBe(true);
  });

  it('does not apply the externalUrl policy to data URLs', () => {
    validateUrl(PNG);
    expect(externalUrl.validateUrl).not.toHaveBeenCalled();
  });

  it.each([
    ['svg', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],
    ['html', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='],
    ['non-base64', 'data:image/png,abc'],
    ['invalid base64 characters', 'data:image/png;base64,abc"onerror="alert(1)'],
    ['empty payload', 'data:image/png;base64,'],
  ])('rejects %s data URLs', (_, url) => {
    const { isValid, error } = validateUrl(url);
    expect(isValid).toBe(false);
    expect(error).toBeDefined();
  });

  it('rejects data URLs over the size limit', () => {
    const url = `data:image/png;base64,${'A'.repeat(MAX_IMAGE_URL_LENGTH)}`;
    const { isValid, error } = validateUrl(url);
    expect(isValid).toBe(false);
    expect(error).toContain('too long');
  });
});
