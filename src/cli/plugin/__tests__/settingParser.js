var path = require('path');
var expect = require('expect.js');

var utils = require('requirefrom')('src/utils');
var fromRoot = utils('fromRoot');
var settingParser = require('../settingParser');

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('command line option parsing', function () {

      describe('parseMilliseconds function', function () {

        var parser = settingParser();

        it('should return 0 for an empty string', function () {
          var value = '';

          var result = parser.parseMilliseconds(value);

          expect(result).to.be(0);
        });

        it('should return 0 for a number with an invalid unit of measure', function () {
          var result = parser.parseMilliseconds('1gigablasts');
          expect(result).to.be(0);
        });

        it('should assume a number with no unit of measure is specified as milliseconds', function () {
          var result = parser.parseMilliseconds(1);
          expect(result).to.be(1);

          result = parser.parseMilliseconds('1');
          expect(result).to.be(1);
        });

        it('should interpret a number with "s" as the unit of measure as seconds', function () {
          var result = parser.parseMilliseconds('5s');
          expect(result).to.be(5 * 1000);
        });

        it('should interpret a number with "second" as the unit of measure as seconds', function () {
          var result = parser.parseMilliseconds('5second');
          expect(result).to.be(5 * 1000);
        });

        it('should interpret a number with "seconds" as the unit of measure as seconds', function () {
          var result = parser.parseMilliseconds('5seconds');
          expect(result).to.be(5 * 1000);
        });

        it('should interpret a number with "m" as the unit of measure as minutes', function () {
          var result = parser.parseMilliseconds('9m');
          expect(result).to.be(9 * 1000 * 60);
        });

        it('should interpret a number with "minute" as the unit of measure as minutes', function () {
          var result = parser.parseMilliseconds('9minute');
          expect(result).to.be(9 * 1000 * 60);
        });

        it('should interpret a number with "minutes" as the unit of measure as minutes', function () {
          var result = parser.parseMilliseconds('9minutes');
          expect(result).to.be(9 * 1000 * 60);
        });

      });

      describe('parse function', function () {

        var options;
        var parser;
        beforeEach(function () {
          options = { install: 'dummy/dummy', pluginDir: fromRoot('installedPlugins') };
        });

        it('should require the user to specify either install and remove', function () {
          options.install = null;
          parser = settingParser(options);

          expect(parser.parse).withArgs().to.throwError(/Please specify either --install or --remove./);
        });

        it('should not allow the user to specify both install and remove', function () {
          options.remove = 'package';
          options.install = 'org/package/version';
          parser = settingParser(options);

          expect(parser.parse).withArgs().to.throwError(/Please specify either --install or --remove./);
        });

        describe('quiet option', function () {

          it('should default to false', function () {
            parser = settingParser(options);
            var settings = parser.parse(options);

            expect(settings.quiet).to.be(false);
          });

          it('should set settings.quiet property to true', function () {
            options.parent = { quiet: true };
            parser = settingParser(options);
            var settings = parser.parse(options);

            expect(settings.quiet).to.be(true);
          });

        });

        describe('silent option', function () {

          it('should default to false', function () {
            parser = settingParser(options);
            var settings = parser.parse(options);

            expect(settings).to.have.property('silent', false);
          });

          it('should set settings.silent property to true', function () {
            options.silent = true;
            parser = settingParser(options);
            var settings = parser.parse(options);

            expect(settings).to.have.property('silent', true);
          });

        });


        describe('timeout option', function () {

          it('should default to 0 (milliseconds)', function () {
            parser = settingParser(options);
            var settings = parser.parse(options);

            expect(settings).to.have.property('timeout', 0);
          });

          it('should set settings.timeout property to specified value', function () {
            options.timeout = 1234;
            parser = settingParser(options);
            var settings = parser.parse(options);

            expect(settings).to.have.property('timeout', 1234);
          });

        });

        describe('install option', function () {

          it('should set settings.action property to "install"', function () {
            options.install = 'org/package/version';
            parser = settingParser(options);
            var settings = parser.parse(options);

            expect(settings).to.have.property('action', 'install');
          });

          it('should allow two parts to the install parameter', function () {
            options.install = 'kibana/test-plugin';
            parser = settingParser(options);

            expect(parser.parse).withArgs().to.not.throwError();

            var settings = parser.parse(options);

            expect(settings).to.have.property('organization', 'kibana');
            expect(settings).to.have.property('package', 'test-plugin');
            expect(settings).to.have.property('version', undefined);
          });

          it('should allow three parts to the install parameter', function () {
            options.install = 'kibana/test-plugin/v1.0.1';
            parser = settingParser(options);

            expect(parser.parse).withArgs().to.not.throwError();

            var settings = parser.parse(options);

            expect(settings).to.have.property('organization', 'kibana');
            expect(settings).to.have.property('package', 'test-plugin');
            expect(settings).to.have.property('version', 'v1.0.1');
          });

          it('should not allow one part to the install parameter', function () {
            options.install = 'test-plugin';
            parser = settingParser(options);

            expect(parser.parse).withArgs().to.throwError(/Invalid install option. Please use the format <org>\/<plugin>\/<version>./);
          });

          it('should not allow more than three parts to the install parameter', function () {
            options.install = 'kibana/test-plugin/v1.0.1/dummy';
            parser = settingParser(options);

            expect(parser.parse).withArgs().to.throwError(/Invalid install option. Please use the format <org>\/<plugin>\/<version>./);
          });

          it('should populate the urls collection properly when no version specified', function () {
            options.install = 'kibana/test-plugin';
            parser = settingParser(options);

            var settings = parser.parse();

            expect(settings.urls).to.have.property('length', 2);
            expect(settings.urls).to.contain('https://download.elastic.co/kibana/test-plugin/test-plugin-latest.tar.gz');
            expect(settings.urls).to.contain('https://github.com/kibana/test-plugin/archive/master.tar.gz');
          });

          it('should populate the urls collection properly version specified', function () {
            options.install = 'kibana/test-plugin/v1.1.1';
            parser = settingParser(options);

            var settings = parser.parse();

            expect(settings.urls).to.have.property('length', 2);
            expect(settings.urls).to.contain('https://download.elastic.co/kibana/test-plugin/test-plugin-v1.1.1.tar.gz');
            expect(settings.urls).to.contain('https://github.com/kibana/test-plugin/archive/v1.1.1.tar.gz');
          });

          it('should populate the pluginPath', function () {
            options.install = 'kibana/test-plugin';
            parser = settingParser(options);

            var settings = parser.parse();
            var expected = fromRoot('installedPlugins/test-plugin');

            expect(settings).to.have.property('pluginPath', expected);
          });

          describe('with url option', function () {

            it('should allow one part to the install parameter', function () {
              options.install = 'test-plugin';
              options.url = 'http://www.google.com/plugin.tar.gz';
              parser = settingParser(options);

              expect(parser.parse).withArgs().to.not.throwError();

              var settings = parser.parse();

              expect(settings).to.have.property('package', 'test-plugin');
            });

            it('should not allow more than one part to the install parameter', function () {
              options.url = 'http://www.google.com/plugin.tar.gz';
              options.install = 'kibana/test-plugin';
              parser = settingParser(options);

              expect(parser.parse).withArgs()
                .to.throwError(/Invalid install option. When providing a url, please use the format <plugin>./);
            });

            it('should result in only the specified url in urls collection', function () {
              var url = 'http://www.google.com/plugin.tar.gz';
              options.install = 'test-plugin';
              options.url = url;
              parser = settingParser(options);

              var settings = parser.parse();

              expect(settings).to.have.property('urls');
              expect(settings.urls).to.be.an('array');
              expect(settings.urls).to.have.property('length', 1);
              expect(settings.urls).to.contain(url);
            });

          });

        });

        describe('remove option', function () {

          it('should set settings.action property to "remove"', function () {
            options.install = null;
            options.remove = 'package';
            parser = settingParser(options);

            var settings = parser.parse();

            expect(settings).to.have.property('action', 'remove');
          });

          it('should allow one part to the remove parameter', function () {
            options.install = null;
            options.remove = 'test-plugin';
            parser = settingParser(options);

            var settings = parser.parse();

            expect(settings).to.have.property('package', 'test-plugin');
          });

          it('should not allow more than one part to the install parameter', function () {
            options.install = null;
            options.remove = 'kibana/test-plugin';
            parser = settingParser(options);

            expect(parser.parse).withArgs()
              .to.throwError(/Invalid remove option. Please use the format <plugin>./);
          });

          it('should populate the pluginPath', function () {
            options.install = null;
            options.remove = 'test-plugin';
            parser = settingParser(options);

            var settings = parser.parse();
            var expected = fromRoot('installedPlugins/test-plugin');

            expect(settings).to.have.property('pluginPath', expected);
          });

        });

      });

    });

  });

});
