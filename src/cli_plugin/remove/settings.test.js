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

import { fromRoot } from '../../core/server/utils';
import { parse } from './settings';

describe('kibana cli', function() {
  describe('plugin installer', function() {
    describe('command line option parsing', function() {
      describe('parse function', function() {
        const command = 'plugin name';
        let options = {};
        const kbnPackage = { version: 1234 };
        beforeEach(function() {
          options = { pluginDir: fromRoot('plugins') };
        });

        describe('quiet option', function() {
          it('should default to false', function() {
            const settings = parse(command, options, kbnPackage);

            expect(settings.quiet).toBe(false);
          });

          it('should set settings.quiet property to true', function() {
            options.quiet = true;
            const settings = parse(command, options, kbnPackage);

            expect(settings.quiet).toBe(true);
          });
        });

        describe('silent option', function() {
          it('should default to false', function() {
            const settings = parse(command, options, kbnPackage);

            expect(settings.silent).toBe(false);
          });

          it('should set settings.silent property to true', function() {
            options.silent = true;
            const settings = parse(command, options, kbnPackage);

            expect(settings.silent).toBe(true);
          });
        });

        describe('config option', function() {
          it('should default to ZLS', function() {
            const settings = parse(command, options, kbnPackage);

            expect(settings.config).toBe('');
          });

          it('should set settings.config property', function() {
            options.config = 'foo bar baz';
            const settings = parse(command, options, kbnPackage);

            expect(settings.config).toBe('foo bar baz');
          });
        });

        describe('pluginDir option', function() {
          it('should default to plugins', function() {
            const settings = parse(command, options, kbnPackage);

            expect(settings.pluginDir).toBe(fromRoot('plugins'));
          });

          it('should set settings.config property', function() {
            options.pluginDir = 'foo bar baz';
            const settings = parse(command, options, kbnPackage);

            expect(settings.pluginDir).toBe('foo bar baz');
          });
        });

        describe('command value', function() {
          it('should set settings.plugin property', function() {
            const settings = parse(command, options, kbnPackage);

            expect(settings.plugin).toBe(command);
          });
        });
      });
    });
  });
});
