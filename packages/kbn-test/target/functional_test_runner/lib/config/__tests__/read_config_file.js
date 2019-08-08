"use strict";

var _expect = _interopRequireDefault(require("@kbn/expect"));

var _devUtils = require("@kbn/dev-utils");

var _read_config_file = require("../read_config_file");

var _config = require("../config");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
const log = new _devUtils.ToolingLog();
describe('readConfigFile()', () => {
  it('reads config from a file, returns an instance of Config class', async () => {
    const config = await (0, _read_config_file.readConfigFile)(log, require.resolve('./fixtures/config.1'));
    (0, _expect.default)(config).to.be.a(_config.Config);
    (0, _expect.default)(config.get('testFiles')).to.eql(['config.1']);
  });
  it('merges setting overrides into log', async () => {
    const config = await (0, _read_config_file.readConfigFile)(log, require.resolve('./fixtures/config.1'), {
      screenshots: {
        directory: 'foo.bar'
      }
    });
    (0, _expect.default)(config.get('screenshots.directory')).to.be('foo.bar');
  });
  it('supports loading config files from within config files', async () => {
    const config = await (0, _read_config_file.readConfigFile)(log, require.resolve('./fixtures/config.2'));
    (0, _expect.default)(config.get('testFiles')).to.eql(['config.1', 'config.2']);
  });
  it('throws if settings are invalid', async () => {
    try {
      await (0, _read_config_file.readConfigFile)(log, require.resolve('./fixtures/config.invalid'));
      throw new Error('expected readConfigFile() to fail');
    } catch (err) {
      (0, _expect.default)(err.message).to.match(/"foo"/);
    }
  });
  it('throws if config does not define testFiles', async () => {
    try {
      await (0, _read_config_file.readConfigFile)(log, require.resolve('./fixtures/config.4'));
      throw new Error('expected readConfigFile() to fail');
    } catch (err) {
      (0, _expect.default)(err.message).to.match(/"testFiles"/);
    }
  });
  it('does not throw if child config file does not have any testFiles', async () => {
    const config = await (0, _read_config_file.readConfigFile)(log, require.resolve('./fixtures/config.3'));
    (0, _expect.default)(config.get('screenshots.directory')).to.be('bar');
  });
});