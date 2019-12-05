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
import { resolve } from 'path';
import { parseMilliseconds, parse } from './settings';

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('command line option parsing', function () {

      describe('parseMilliseconds function', function () {

        it('should return 0 for an empty string', function () {
          const value = '';
          const result = parseMilliseconds(value);

          expect(result).toBe(0);
        });

        it('should return 0 for a number with an invalid unit of measure', function () {
          const result = parseMilliseconds('1gigablasts');
          expect(result).toBe(0);
        });

        it('should assume a number with no unit of measure is specified as milliseconds', function () {
          const result = parseMilliseconds(1);
          expect(result).toBe(1);

          const result2 = parseMilliseconds('1');
          expect(result2).toBe(1);
        });

        it('should interpret a number with "s" as the unit of measure as seconds', function () {
          const result = parseMilliseconds('5s');
          expect(result).toBe(5 * 1000);
        });

        it('should interpret a number with "second" as the unit of measure as seconds', function () {
          const result = parseMilliseconds('5second');
          expect(result).toBe(5 * 1000);
        });

        it('should interpret a number with "seconds" as the unit of measure as seconds', function () {
          const result = parseMilliseconds('5seconds');
          expect(result).toBe(5 * 1000);
        });

        it('should interpret a number with "m" as the unit of measure as minutes', function () {
          const result = parseMilliseconds('9m');
          expect(result).toBe(9 * 1000 * 60);
        });

        it('should interpret a number with "minute" as the unit of measure as minutes', function () {
          const result = parseMilliseconds('9minute');
          expect(result).toBe(9 * 1000 * 60);
        });

        it('should interpret a number with "minutes" as the unit of measure as minutes', function () {
          const result = parseMilliseconds('9minutes');
          expect(result).toBe(9 * 1000 * 60);
        });

      });

      describe('parse function', function () {

        const command = 'plugin name';
        let options = {};
        const kbnPackage = { version: 1234 };
        beforeEach(function () {
          options = { pluginDir: fromRoot('plugins') };
        });

        describe('timeout option', function () {

          it('should default to 0 (milliseconds)', function () {
            const settings = parse(command, options, kbnPackage);

            expect(settings.timeout).toBe(0);
          });

          it('should set settings.timeout property', function () {
            options.timeout = 1234;
            const settings = parse(command, options, kbnPackage);

            expect(settings.timeout).toBe(1234);
          });

        });

        describe('quiet option', function () {

          it('should default to false', function () {
            const settings = parse(command, options, kbnPackage);

            expect(settings.quiet).toBe(false);
          });

          it('should set settings.quiet property to true', function () {
            options.quiet = true;
            const settings = parse(command, options, kbnPackage);

            expect(settings.quiet).toBe(true);
          });

        });

        describe('silent option', function () {

          it('should default to false', function () {
            const settings = parse(command, options, kbnPackage);

            expect(settings.silent).toBe(false);
          });

          it('should set settings.silent property to true', function () {
            options.silent = true;
            const settings = parse(command, options, kbnPackage);

            expect(settings.silent).toBe(true);
          });

        });

        describe('config option', function () {

          it('should default to ZLS', function () {
            const settings = parse(command, options, kbnPackage);

            expect(settings.config).toBe('');
          });

          it('should set settings.config property', function () {
            options.config = 'foo bar baz';
            const settings = parse(command, options, kbnPackage);

            expect(settings.config).toBe('foo bar baz');
          });

        });

        describe('pluginDir option', function () {

          it('should default to plugins', function () {
            const settings = parse(command, options, kbnPackage);

            expect(settings.pluginDir).toBe(fromRoot('plugins'));
          });

          it('should set settings.config property', function () {
            options.pluginDir = 'foo bar baz';
            const settings = parse(command, options, kbnPackage);

            expect(settings.pluginDir).toBe('foo bar baz');
          });

        });

        describe('command value', function () {

          it('should set settings.plugin property', function () {
            const settings = parse(command, options, kbnPackage);

            expect(settings.plugin).toBe(command);
          });

        });

        describe('urls collection', function () {

          it('should populate the settings.urls property', function () {
            const settings = parse(command, options, kbnPackage);

            const expected = [
              command,
              `https://artifacts.elastic.co/downloads/kibana-plugins/${command}/${command}-1234.zip`
            ];

            expect(settings.urls).toEqual(expected);
          });

        });

        describe('workingPath value', function () {

          it('should set settings.workingPath property', function () {
            options.pluginDir = 'foo/bar/baz';
            const settings = parse(command, options, kbnPackage);
            const expected = resolve('foo/bar/baz', '.plugin.installing');

            expect(settings.workingPath).toBe(expected);
          });

        });

        describe('tempArchiveFile value', function () {

          it('should set settings.tempArchiveFile property', function () {
            options.pluginDir = 'foo/bar/baz';
            const settings = parse(command, options, kbnPackage);
            const expected = resolve('foo/bar/baz', '.plugin.installing', 'archive.part');

            expect(settings.tempArchiveFile).toBe(expected);
          });

        });

        describe('tempPackageFile value', function () {

          it('should set settings.tempPackageFile property', function () {
            options.pluginDir = 'foo/bar/baz';
            const settings = parse(command, options, kbnPackage);
            const expected = resolve('foo/bar/baz', '.plugin.installing', 'package.json');

            expect(settings.tempPackageFile).toBe(expected);
          });

        });

      });

    });

  });

});
