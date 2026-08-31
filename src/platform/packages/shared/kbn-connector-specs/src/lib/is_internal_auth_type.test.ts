/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isInternalAuthType } from './is_internal_auth_type';

describe('isInternalAuthType()', () => {
  test('is true for an internal auth type the spec offers', () => {
    expect(isInternalAuthType('.slack2', 'relay')).toBe(true);
  });

  test('is false for the auth types a user is meant to pick', () => {
    expect(isInternalAuthType('.slack2', 'bearer')).toBe(false);
    expect(isInternalAuthType('.slack2', 'ears')).toBe(false);
    expect(isInternalAuthType('.slack2', 'oauth_authorization_code')).toBe(false);
  });

  test('is false for an auth type the spec does not declare at all', () => {
    expect(isInternalAuthType('.slack2', 'basic')).toBe(false);
  });

  test('is false for a connector that does not offer the internal auth type', () => {
    expect(isInternalAuthType('.notion', 'relay')).toBe(false);
  });

  test('is false for an unknown connector type', () => {
    expect(isInternalAuthType('.not_a_connector', 'relay')).toBe(false);
  });

  test('is false when no auth type is given', () => {
    expect(isInternalAuthType('.slack2', undefined)).toBe(false);
  });
});
