/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getNodeSSLOptions, getSSLSettingsFromConfig } from './get_node_ssl_options';
import type { Logger } from '@kbn/logging';

const logger = {
  warn: jest.fn(),
} as unknown as Logger;

describe('getNodeSSLOptions', () => {
  test('get node.js SSL options: rejectUnauthorized eql true for the verification mode "full"', () => {
    const nodeOption = getNodeSSLOptions(logger, 'full');
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: true,
    });
  });

  test('get node.js SSL options: rejectUnauthorized eql true for the verification mode "certificate"', () => {
    const nodeOption = getNodeSSLOptions(logger, 'certificate');
    expect(nodeOption.checkServerIdentity).not.toBeNull();
    expect(nodeOption.rejectUnauthorized).toBeTruthy();
  });

  test('get node.js SSL options: rejectUnauthorized eql false for the verification mode "none"', () => {
    const nodeOption = getNodeSSLOptions(logger, 'none');
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: false,
    });
  });

  test('get node.js SSL options: rejectUnauthorized eql true for the verification mode value which does not exist, the logger called with the proper warning message', () => {
    const nodeOption = getNodeSSLOptions(logger, 'notexist');
    expect(logger.warn).toHaveBeenCalledWith(`Unknown ssl verificationMode: notexist`);
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: true,
    });
  });

  test('appends SSL overrides', () => {
    const nodeOptionPFX = getNodeSSLOptions(logger, 'none', {
      pfx: Buffer.from("Hi i'm a pfx"),
      ca: Buffer.from("Hi i'm a ca"),
      passphrase: 'aaaaaaa',
    });
    expect(nodeOptionPFX).toMatchInlineSnapshot(`
      Object {
        "ca": Object {
          "data": Array [
            72,
            105,
            32,
            105,
            39,
            109,
            32,
            97,
            32,
            99,
            97,
          ],
          "type": "Buffer",
        },
        "cert": undefined,
        "key": undefined,
        "passphrase": "aaaaaaa",
        "pfx": Object {
          "data": Array [
            72,
            105,
            32,
            105,
            39,
            109,
            32,
            97,
            32,
            112,
            102,
            120,
          ],
          "type": "Buffer",
        },
        "rejectUnauthorized": false,
      }
    `);

    const nodeOptionCert = getNodeSSLOptions(logger, 'none', {
      cert: Buffer.from("Hi i'm a cert"),
      key: Buffer.from("Hi i'm a key"),
      ca: Buffer.from("Hi i'm a ca"),
      passphrase: 'aaaaaaa',
    });
    expect(nodeOptionCert).toMatchInlineSnapshot(`
      Object {
        "ca": Object {
          "data": Array [
            72,
            105,
            32,
            105,
            39,
            109,
            32,
            97,
            32,
            99,
            97,
          ],
          "type": "Buffer",
        },
        "cert": Object {
          "data": Array [
            72,
            105,
            32,
            105,
            39,
            109,
            32,
            97,
            32,
            99,
            101,
            114,
            116,
          ],
          "type": "Buffer",
        },
        "key": Object {
          "data": Array [
            72,
            105,
            32,
            105,
            39,
            109,
            32,
            97,
            32,
            107,
            101,
            121,
          ],
          "type": "Buffer",
        },
        "passphrase": "aaaaaaa",
        "pfx": undefined,
        "rejectUnauthorized": false,
      }
    `);
  });
});

describe('getSSLSettingsFromConfig', () => {
  test('get verificationMode eql "none" if legacy rejectUnauthorized eql false', () => {
    const nodeOption = getSSLSettingsFromConfig(undefined, false);
    expect(nodeOption).toMatchObject({
      verificationMode: 'none',
    });
  });

  test('get verificationMode eql "none" if legacy rejectUnauthorized eql true', () => {
    const nodeOption = getSSLSettingsFromConfig(undefined, true);
    expect(nodeOption).toMatchObject({
      verificationMode: 'full',
    });
  });

  test('get verificationMode eql "certificate", ignore rejectUnauthorized', () => {
    const nodeOption = getSSLSettingsFromConfig('certificate', false);
    expect(nodeOption).toMatchObject({
      verificationMode: 'certificate',
    });
  });

  test('get verificationMode eql "full", if both values eql undefined', () => {
    const nodeOption = getSSLSettingsFromConfig(undefined, undefined);
    expect(nodeOption).toMatchObject({
      verificationMode: 'full',
    });
  });
});
