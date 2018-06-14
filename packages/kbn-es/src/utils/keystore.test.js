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

const { PassThrough } = require('stream');
const { createKeystore, keystoreAdd } = require('./keystore');

jest.mock('execa');
const execa = require('execa');

describe('createKeystore', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects if a Keystore already exists', async () => {
    const stdout = new PassThrough();
    execa.mockReturnValue({ stdout });
    expect(createKeystore()).rejects.toThrow(
      'an Elasticsearch Keystore already exists'
    );

    stdout.write('An elasticsearch keystore already exists. Overwrite? [y/N]');
  });

  it('resolves if successful', () => {
    const stdout = new PassThrough();
    execa.mockReturnValue({ stdout });
    expect(createKeystore()).resolves.toBe(undefined);

    stdout.write(
      'Created elasticsearch keystore in /foo/.es/7.0.0-alpha1/config'
    );
  });
});

describe('keystoreAdd', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects if a key already exists', async () => {
    const stdio = new PassThrough();
    stdio.stdout = new PassThrough();

    execa.mockReturnValue(stdio);
    expect(keystoreAdd('/tmp', 'foo')).rejects.toThrow('foo already exists');

    stdio.stdout.write('Setting foo already exists. Overwrite? [y/N]');
  });

  it('resolves if successful', () => {
    const stdio = new PassThrough();
    stdio.stdout = new PassThrough();

    execa.mockReturnValue(stdio);
    expect(keystoreAdd('/tmp', 'foo')).resolves.toBe(undefined);

    stdio.end();
  });
});
