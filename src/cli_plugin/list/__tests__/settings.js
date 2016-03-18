import path from 'path';
import expect from 'expect.js';
import fromRoot from '../../../utils/from_root';
import { resolve } from 'path';
import { parseMilliseconds, parse } from '../settings';

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('command line option parsing', function () {

      describe('parse function', function () {

        let command;
        const options = {};
        beforeEach(function () {
          command = { pluginDir: fromRoot('installedPlugins') };
        });

        describe('pluginDir option', function () {

          it('should default to installedPlugins', function () {
            const settings = parse(command, options);

            expect(settings.pluginDir).to.be(fromRoot('installedPlugins'));
          });

          it('should set settings.config property', function () {
            command.pluginDir = 'foo bar baz';
            const settings = parse(command, options);

            expect(settings.pluginDir).to.be('foo bar baz');
          });

        });

      });

    });

  });

});
