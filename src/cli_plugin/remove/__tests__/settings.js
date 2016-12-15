import path from 'path';
import expect from 'expect.js';
import fromRoot from '../../../utils/from_root';
import { resolve } from 'path';
import { parseMilliseconds, parse } from '../settings';

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('command line option parsing', function () {

      describe('parse function', function () {

        const command = 'plugin name';
        let options = {};
        const kbnPackage = { version: 1234 };
        beforeEach(function () {
          options = { pluginDir: fromRoot('plugins') };
        });

        describe('quiet option', function () {

          it('should default to false', function () {
            const settings = parse(command, options, kbnPackage);

            expect(settings.quiet).to.be(false);
          });

          it('should set settings.quiet property to true', function () {
            options.quiet = true;
            const settings = parse(command, options, kbnPackage);

            expect(settings.quiet).to.be(true);
          });

        });

        describe('silent option', function () {

          it('should default to false', function () {
            const settings = parse(command, options, kbnPackage);

            expect(settings.silent).to.be(false);
          });

          it('should set settings.silent property to true', function () {
            options.silent = true;
            const settings = parse(command, options, kbnPackage);

            expect(settings.silent).to.be(true);
          });

        });

        describe('config option', function () {

          it('should default to ZLS', function () {
            const settings = parse(command, options, kbnPackage);

            expect(settings.config).to.be('');
          });

          it('should set settings.config property', function () {
            options.config = 'foo bar baz';
            const settings = parse(command, options, kbnPackage);

            expect(settings.config).to.be('foo bar baz');
          });

        });

        describe('pluginDir option', function () {

          it('should default to plugins', function () {
            const settings = parse(command, options, kbnPackage);

            expect(settings.pluginDir).to.be(fromRoot('plugins'));
          });

          it('should set settings.config property', function () {
            options.pluginDir = 'foo bar baz';
            const settings = parse(command, options, kbnPackage);

            expect(settings.pluginDir).to.be('foo bar baz');
          });

        });

        describe('command value', function () {

          it('should set settings.plugin property', function () {
            const settings = parse(command, options, kbnPackage);

            expect(settings.plugin).to.be(command);
          });

        });

      });

    });

  });

});
