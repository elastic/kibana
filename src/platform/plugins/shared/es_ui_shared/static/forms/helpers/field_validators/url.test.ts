/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { urlField } from '.';
import type { ValidationError } from '../../hook_form_lib';
import { ERROR_CODE } from './types';

describe('urlField', () => {
  const message = 'test error message';
  const code = 'ERR_FIELD_FORMAT';
  const formatType = 'URL';
  const errorMessage = { code, formatType, message };

  const validator = (value: any, requireTld?: boolean) => {
    const validate = urlField(message, { requireTld });
    return validate({
      value,
      path: 'url',
      form: {
        getFormData: () => ({}),
        getFields: () => ({} as any),
      },
      formData: {},
      errors: [],
      customData: {
        provider: async () => undefined,
        value: undefined,
      },
    }) as ValidationError<ERROR_CODE> | undefined;
  };

  test('should return error if value is not a string', () => {
    expect(validator(123)).toMatchObject(errorMessage);
    expect(validator({})).toMatchObject(errorMessage);
    expect(validator(null)).toMatchObject(errorMessage);
  });

  test('should return error if the value does not have the correct format', () => {
    expect(validator('invalid-url')).toMatchObject(errorMessage);
  });

  describe('url with requireTld =  true', () => {
    test('should return undefined for a valid url with tld', () => {
      expect(validator('http://example.com')).toBeUndefined();
    });

    test('should return error for an invalid url with tld', () => {
      expect(validator('http://test/v1/chat/completions')).toMatchObject(errorMessage);
      expect(validator('http://myllm:8443/v1/chat/completions')).toMatchObject(errorMessage);
    });
  });

  describe('url with requiredTld = false', () => {
    test('should return undefined for a valid url', () => {
      expect(validator('http://test/v1/chat/completions', false)).toBeUndefined();
      expect(validator('http://myllm:8443/v1/chat/completions', false)).toBeUndefined();
    });

    test('should return error if the url ends with a dot', () => {
      expect(validator('http://test/v1/chat/completions.', false)).toMatchObject(errorMessage);
    });

    test('should return error if the url contains spaces', () => {
      expect(validator('http://exam ple.com', false)).toMatchObject(errorMessage);
    });
  });
});
