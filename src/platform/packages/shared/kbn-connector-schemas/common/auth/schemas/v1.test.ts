/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SecretConfigurationSchemaValidation } from './v1';

describe('SecretConfigurationSchemaValidation', () => {
  const { validate } = SecretConfigurationSchemaValidation;

  describe('valid configurations', () => {
    it('should accept empty credentials', () => {
      const result = validate({
        user: null,
        password: null,
        crt: null,
        key: null,
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBeUndefined();
    });

    it('should accept basic auth credentials', () => {
      const result = validate({
        user: 'username',
        password: 'password',
        crt: null,
        key: null,
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBeUndefined();
    });

    it('should accept SSL certificate credentials', () => {
      const result = validate({
        user: null,
        password: null,
        crt: 'certificate-content',
        key: 'key-content',
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBeUndefined();
    });

    it('should accept SSL certificate with optional password', () => {
      const result = validate({
        user: null,
        password: 'cert-password',
        crt: 'certificate-content',
        key: 'key-content',
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBeUndefined();
    });

    it('should accept PFX certificate credentials', () => {
      const result = validate({
        user: null,
        password: null,
        crt: null,
        key: null,
        pfx: 'pfx-content',
        clientSecret: null,
      });
      expect(result).toBeUndefined();
    });

    it('should accept PFX certificate with optional password', () => {
      const result = validate({
        user: null,
        password: 'pfx-password',
        crt: null,
        key: null,
        pfx: 'pfx-content',
        clientSecret: null,
      });
      expect(result).toBeUndefined();
    });

    it('should accept OAuth2 credentials', () => {
      const result = validate({
        user: null,
        password: null,
        crt: null,
        key: null,
        pfx: null,
        clientSecret: 'oauth2-client-secret',
      });
      expect(result).toBeUndefined();
    });
  });

  describe('invalid configurations', () => {
    const errorMessage =
      'must specify one of the following schemas: user and password; crt and key (with optional password); pfx (with optional password); or clientSecret (for OAuth2)';

    it('should reject mixed basic auth and SSL certificate', () => {
      const result = validate({
        user: 'username',
        password: 'password',
        crt: 'certificate-content',
        key: 'key-content',
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should reject mixed basic auth and PFX certificate', () => {
      const result = validate({
        user: 'username',
        password: 'password',
        crt: null,
        key: null,
        pfx: 'pfx-content',
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should reject mixed SSL certificate and PFX certificate', () => {
      const result = validate({
        user: null,
        password: null,
        crt: 'certificate-content',
        key: 'key-content',
        pfx: 'pfx-content',
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should reject incomplete basic auth (missing password)', () => {
      const result = validate({
        user: 'username',
        password: null,
        crt: null,
        key: null,
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should reject incomplete basic auth (missing username)', () => {
      const result = validate({
        user: null,
        password: 'password',
        crt: null,
        key: null,
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should reject incomplete SSL certificate (missing key)', () => {
      const result = validate({
        user: null,
        password: null,
        crt: 'certificate-content',
        key: null,
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should reject incomplete SSL certificate (missing certificate)', () => {
      const result = validate({
        user: null,
        password: null,
        crt: null,
        key: 'key-content',
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should not accept invalid OAuth2 credentials', () => {
      const result = validate({
        user: null,
        password: 'password',
        crt: null,
        key: null,
        pfx: null,
        clientSecret: 'oauth2-client-secret',
      });
      expect(result).toBe(errorMessage);
    });
  });
});
