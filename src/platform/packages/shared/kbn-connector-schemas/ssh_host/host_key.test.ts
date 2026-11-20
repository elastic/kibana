/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parsePinnedHostKey } from './host_key';

describe('parsePinnedHostKey', () => {
  const blob = Buffer.from('host-key-a').toString('base64');

  it('accepts a bare blob and an OpenSSH line', () => {
    expect(parsePinnedHostKey(blob)).toBe(blob);
    expect(parsePinnedHostKey(`ssh-ed25519 ${blob} server.example`)).toBe(blob);
    expect(parsePinnedHostKey(`ssh-ed25519 ${blob}`)).toBe(blob);
  });

  it('rejects empty, short, and non-key text', () => {
    expect(parsePinnedHostKey(undefined)).toBeUndefined();
    expect(parsePinnedHostKey('')).toBeUndefined();
    expect(parsePinnedHostKey('   ')).toBeUndefined();
    expect(parsePinnedHostKey('not-a-key')).toBeUndefined();
    expect(parsePinnedHostKey('ssh-ed25519 not-base64')).toBeUndefined();
  });
});
