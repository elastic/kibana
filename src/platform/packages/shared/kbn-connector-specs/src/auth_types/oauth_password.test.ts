/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OAuthPassword } from './oauth_password';

const secrets = {
  tokenUrl: 'https://identity.example.com/token',
  clientId: 'client',
  username: 'user',
  password: 'password',
};

describe('OAuthPassword', () => {
  it('uses the standard username field and form encoding by default', () => {
    expect(OAuthPassword.schema.parse(secrets)).toMatchObject({
      usernameField: 'username',
      requestBodyFormat: 'form',
    });
  });

  it.each([
    'http://identity.example.com/token',
    'https://user:password@identity.example.com/token',
    'https://identity.example.com/token#fragment',
  ])('rejects unsafe token URL %s', (tokenUrl) => {
    expect(OAuthPassword.schema.safeParse({ ...secrets, tokenUrl }).success).toBe(false);
  });

  it.each(['password', 'client_id', 'grant_type'])(
    'rejects a username field that replaces %s',
    (usernameField) => {
      expect(OAuthPassword.schema.safeParse({ ...secrets, usernameField }).success).toBe(false);
    }
  );

  it.each(['username', 'password', 'clientId'])('bounds credential field %s', (field) => {
    expect(OAuthPassword.schema.safeParse({ ...secrets, [field]: 'x'.repeat(4097) }).success).toBe(
      false
    );
  });
});
