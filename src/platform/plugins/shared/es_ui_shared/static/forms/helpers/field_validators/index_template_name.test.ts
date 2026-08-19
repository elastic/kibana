/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ValidationError } from '../../hook_form_lib';
import type { ERROR_CODE } from './types';
import { indexTemplateNameField } from '.';

describe('indexTemplateNameField', () => {
  const i18n = {
    translate: (_key: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
  };

  const validate = (value: unknown) => {
    const validator = indexTemplateNameField(i18n);

    return validator({
      value,
      path: 'name',
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

  test('should error when name contains a space', () => {
    expect(validate('has space')).toMatchObject({
      code: 'ERR_FIELD_FORMAT',
      formatType: 'INDEX_TEMPLATE_NAME',
      message: 'Name must not contain a space.',
    });
  });

  test('should error when name contains a comma', () => {
    expect(validate('has,comma')).toMatchObject({
      code: 'ERR_FIELD_FORMAT',
      formatType: 'INDEX_TEMPLATE_NAME',
      message: "Name must not contain a ','.",
    });
  });

  test('should error when name contains a hash', () => {
    expect(validate('has#hash')).toMatchObject({
      code: 'ERR_FIELD_FORMAT',
      formatType: 'INDEX_TEMPLATE_NAME',
      message: "Name must not contain a '#'.",
    });
  });

  test('should error when name contains an asterisk', () => {
    expect(validate('has*star')).toMatchObject({
      code: 'ERR_FIELD_FORMAT',
      formatType: 'INDEX_TEMPLATE_NAME',
      message: "Name must not contain a '*'.",
    });
  });

  test('should error when name starts with underscore', () => {
    expect(validate('_starts_with_underscore')).toMatchObject({
      code: 'ERR_FIELD_FORMAT',
      formatType: 'INDEX_TEMPLATE_NAME',
      message: "Name must not start with '_'.",
    });
  });

  test('should error when name is not lower cased', () => {
    expect(validate('HasUpperCase')).toMatchObject({
      code: 'ERR_FIELD_FORMAT',
      formatType: 'INDEX_TEMPLATE_NAME',
      message: 'Name must be lower case.',
    });
  });

  test('should return undefined for a valid name', () => {
    expect(validate('valid-name_123')).toBeUndefined();
  });
});
