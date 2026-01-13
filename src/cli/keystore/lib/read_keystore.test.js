/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { readKeystore } from './read_keystore';

jest.mock('.');
import { Keystore } from '.';

describe('cli/serve/read_keystore', () => {
  beforeEach(() => {
    Keystore.initialize.mockResolvedValue(Promise.resolve(new Keystore()));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns structured keystore data', async () => {
    const keystoreData = { 'elasticsearch.password': 'changeme' };
    Keystore.prototype.data = keystoreData;

    const data = await readKeystore();
    expect(data).toEqual({
      elasticsearch: {
        password: 'changeme',
      },
    });
  });

  it('uses data path if provided', async () => {
    const keystorePath = path.join('/foo/', 'kibana.keystore');

    await readKeystore(keystorePath);
    expect(Keystore.initialize.mock.calls[0][0]).toContain(keystorePath);
  });

  it('uses the getKeystore path if not', async () => {
    await readKeystore();
    // we test exact path scenarios in get_keystore.test.js - we use both
    // deprecated and new to cover any older local environments
    expect(Keystore.initialize.mock.calls[0][0]).toMatch(/data|config/);
  });
});
