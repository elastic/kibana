/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import path from 'path';
import { readKeystore } from './read_keystore';

jest.mock('../keystore');
import { Keystore } from '../keystore';

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
