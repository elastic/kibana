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

import { EncryptionConfig } from './encryption_config';

describe('encryption key configuration', () => {
  let encryptionConfig = null;

  beforeEach(() => {
    encryptionConfig = new EncryptionConfig();
  });
  it('should load the current configuration', () => {
    expect(encryptionConfig._hasEncryptionKey('xpack.reporting.encryptionKey')).toEqual(false);
    expect(encryptionConfig._config).toBeDefined();
  });

  it('should be able to check for encryption keys', () => {
    expect(encryptionConfig._hasEncryptionKey('xpack.reporting.encryptionKey')).toEqual(false);
    encryptionConfig._config = {
      'xpack.reporting.encryptionKey': 'foo',
    };
    expect(encryptionConfig._hasEncryptionKey('xpack.reporting.encryptionKey')).toEqual(true);
  });

  it('should be able to get encryption keys', () => {
    encryptionConfig._config = {
      foo: 'bar',
    };

    expect(encryptionConfig._getEncryptionKey('foo')).toEqual('bar');
  });

  it('should generate a 32 length key', () => {
    expect(encryptionConfig._generateEncryptionKey().length).toEqual(32);
  });

  it('should only generate unset keys', () => {
    encryptionConfig._config = {
      'xpack.security.encryptionKey': 'foo',
    };
    const output = encryptionConfig.generate({ force: false });
    expect(output['xpack.security.encryptionKey']).toEqual(undefined);
    expect(output['xpack.reporting.encryptionKey'].length).toEqual(32);
  });

  it('should regenerate all keys if the force flag is set', () => {
    encryptionConfig._config = {
      'xpack.security.encryptionKey': 'foo',
    };
    const output = encryptionConfig.generate({ force: true });
    expect(output['xpack.security.encryptionKey'].length).toEqual(32);
    expect(output['xpack.reporting.encryptionKey'].length).toEqual(32);
  });

  it('should set encryptedObjects, reporting, and security with a default configuration', () => {
    const output = encryptionConfig.generate({});
    expect(output['xpack.security.encryptionKey'].length).toEqual(32);
    expect(output['xpack.encryptedSavedObjects.encryptionKey'].length).toEqual(32);
    expect(output['xpack.reporting.encryptionKey'].length).toEqual(32);
  });
});
