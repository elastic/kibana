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

import { spawnSync } from 'child_process';
import { resolve } from 'path';

const ROOT_DIR = resolve(__dirname, '../../../../');
const INVALID_CONFIG_PATH = resolve(__dirname, '__fixtures__/invalid_config.yml');

describe('cli invalid config support', function() {
  it(
    'exits with statusCode 64 and logs a single line when config is invalid',
    function() {
      // Unused keys only throw once LegacyService starts, so disable migrations so that Core
      // will finish the start lifecycle without a running Elasticsearch instance.
      const { error, status, stdout } = spawnSync(
        process.execPath,
        ['src/cli', '--config', INVALID_CONFIG_PATH, '--migrations.skip=true'],
        {
          cwd: ROOT_DIR,
        }
      );

      const [fatalLogLine] = stdout
        .toString('utf8')
        .split('\n')
        .filter(Boolean)
        .map(JSON.parse)
        .filter(line => line.tags.includes('fatal'))
        .map(obj => ({
          ...obj,
          pid: '## PID ##',
          '@timestamp': '## @timestamp ##',
          error: '## Error with stack trace ##',
        }));

      expect(error).toBe(undefined);
      expect(status).toBe(64);
      expect(fatalLogLine.message).toMatch(
        '{ Error: "unknown.key", "other.unknown.key", "other.third", "some.flat.key", and "' +
          'some.array" settings were not applied. Check for spelling errors and ensure that expected plugins are installed.'
      );
      expect(fatalLogLine.tags).toEqual(['fatal', 'root']);
      expect(fatalLogLine.type).toEqual('log');
    },
    20 * 1000
  );
});
