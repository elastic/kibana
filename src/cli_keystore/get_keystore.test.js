/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getKeystore } from './get_keystore';
import { Logger } from '../cli_plugin/lib/logger';
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
