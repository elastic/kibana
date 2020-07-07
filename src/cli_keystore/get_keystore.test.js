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

import { getKeystore } from './get_keystore';
import Logger from '../cli_plugin/lib/logger';
import fs from 'fs';
import sinon from 'sinon';

describe('get_keystore', () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(Logger.prototype, 'log');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('uses the config directory if there is no pre-existing keystore', () => {
    sandbox.stub(fs, 'existsSync').returns(false);
    expect(getKeystore()).toContain('config');
    expect(getKeystore()).not.toContain('data');
  });

  it('uses the data directory if there is a pre-existing keystore in the data directory', () => {
    sandbox.stub(fs, 'existsSync').returns(true);
    expect(getKeystore()).toContain('data');
    expect(getKeystore()).not.toContain('config');
  });

  it('logs a deprecation warning if the data directory is used', () => {
    sandbox.stub(fs, 'existsSync').returns(true);
    getKeystore();
    sandbox.assert.calledOnce(Logger.prototype.log);
    sandbox.assert.calledWith(
      Logger.prototype.log,
      'kibana.keystore located in the data folder is deprecated.  Future versions will use the config folder.'
    );
  });
});
