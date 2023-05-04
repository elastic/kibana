/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { readKeystore } from './read_keystore';

jest.mock('.');
import { Keystore } from '.';

describe('cli/serve/read_keystore', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns structured keystore data', () => {
    const keystoreData = { 'elasticsearch.password': 'changeme' };
    Keystore.prototype.data = keystoreData;

    const data = readKeystore();
    expect(data).toEqual({
      elasticsearch: {
        password: 'changeme',
      },
    });
  });

  it('uses data path if provided', () => {
    const keystorePath = path.join('/foo/', 'kibana.keystore');

    readKeystore(keystorePath);
    expect(Keystore.mock.calls[0][0]).toContain(keystorePath);
  });

  it('uses the getKeystore path if not', () => {
    readKeystore();
    // we test exact path scenarios in get_keystore.test.js - we use both
    // deprecated and new to cover any older local environments
    expect(Keystore.mock.calls[0][0]).toMatch(/data|config/);
  });
});
