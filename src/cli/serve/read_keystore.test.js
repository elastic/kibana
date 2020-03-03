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

jest.mock('../../legacy/server/keystore');
import { Keystore } from '../../legacy/server/keystore';

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

  it('uses data path provided', () => {
    const keystoreDir = '/foo/';
    const keystorePath = path.join(keystoreDir, 'kibana.keystore');

    readKeystore(keystoreDir);
    expect(Keystore.mock.calls[0][0]).toEqual(keystorePath);
  });
});
