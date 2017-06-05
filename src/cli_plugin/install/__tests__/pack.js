import expect from 'expect.js';
import sinon from 'sinon';
import glob from 'glob-all';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import Logger from '../../lib/logger';
import { extract, getPackData } from '../pack';
import { _downloadSingle }  from '../download';
import { join } from 'path';

describe('kibana cli', function () {

  describe('pack', function () {

    let testNum = 0;
    const workingPathRoot = join(__dirname, '.test.data');
    let testWorkingPath;
    let tempArchiveFilePath;
    let testPluginPath;
    let logger;
    let settings;

    beforeEach(function () {
      //These tests are dependent on the file system, and I had some inconsistent
      //behavior with rimraf.sync show up. Until these tests are re-written to not
      //depend on the file system, I make sure that each test uses a different
      //working directory.
      testNum += 1;
      testWorkingPath = join(workingPathRoot, testNum + '');
      tempArchiveFilePath = join(testWorkingPath, 'archive.part');
      testPluginPath = join(testWorkingPath, '.installedPlugins');

      settings = {
        workingPath: testWorkingPath,
        tempArchiveFile: tempArchiveFilePath,
        pluginDir: testPluginPath,
        plugin: 'test-plugin'
      };

      logger = new Logger(settings);
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
      mkdirp.sync(testWorkingPath);
    });

    afterEach(function () {
      logger.log.restore();
      logger.error.restore();
      rimraf.sync(workingPathRoot);
    });

    function copyReplyFile(filename) {
      const filePath = join(__dirname, 'replies', filename);
      const sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

      return _downloadSingle(settings, logger, sourceUrl);
    }

    function shouldReject() {
      throw new Error('expected the promise to reject');
    }

    describe('extract', function () {

      //Also only extracts the content from the kibana folder.
      //Ignores the others.
      it('successfully extract a valid zip', function () {
        return copyReplyFile('test_plugin.zip')
        .then(() => {
          return getPackData(settings, logger);
        })
        .then(() => {
          return extract(settings, logger);
        })
        .then(() => {
          const files = glob.sync('**/*', { cwd: testWorkingPath });
          const expected = [
            'archive.part',
            'README.md',
            'index.js',
            'package.json',
            'public',
            'public/app.js',
            'extra file only in zip.txt'
          ];
          expect(files.sort()).to.eql(expected.sort());
        });
      });

    });

    describe('getPackData', function () {

      it('populate settings.plugins', function () {
        return copyReplyFile('test_plugin.zip')
        .then(() => {
          return getPackData(settings, logger);
        })
        .then(() => {
          expect(settings.plugins[0].name).to.be('test-plugin');
          expect(settings.plugins[0].archivePath).to.be('kibana/test-plugin');
          expect(settings.plugins[0].version).to.be('1.0.0');
          expect(settings.plugins[0].kibanaVersion).to.be('1.0.0');
        });
      });

      it('populate settings.plugin.kibanaVersion', function () {
        //kibana.version is defined in this package.json and is different than plugin version
        return copyReplyFile('test_plugin_different_version.zip')
        .then(() => {
          return getPackData(settings, logger);
        })
        .then(() => {
          expect(settings.plugins[0].kibanaVersion).to.be('5.0.1');
        });
      });

      it('populate settings.plugin.kibanaVersion (default to plugin version)', function () {
        //kibana.version is not defined in this package.json, defaults to plugin version
        return copyReplyFile('test_plugin.zip')
        .then(() => {
          return getPackData(settings, logger);
        })
        .then(() => {
          expect(settings.plugins[0].kibanaVersion).to.be('1.0.0');
        });
      });

      it('populate settings.plugins with multiple plugins', function () {
        return copyReplyFile('test_plugin_many.zip')
        .then(() => {
          return getPackData(settings, logger);
        })
        .then(() => {
          expect(settings.plugins[0].name).to.be('funger-plugin');
          expect(settings.plugins[0].archivePath).to.be('kibana/funger-plugin');
          expect(settings.plugins[0].version).to.be('1.0.0');

          expect(settings.plugins[1].name).to.be('pdf');
          expect(settings.plugins[1].archivePath).to.be('kibana/pdf-linux');
          expect(settings.plugins[1].version).to.be('1.0.0');

          expect(settings.plugins[2].name).to.be('pdf');
          expect(settings.plugins[2].archivePath).to.be('kibana/pdf-win32');
          expect(settings.plugins[2].version).to.be('1.0.0');

          expect(settings.plugins[3].name).to.be('pdf');
          expect(settings.plugins[3].archivePath).to.be('kibana/pdf-win64');
          expect(settings.plugins[3].version).to.be('1.0.0');

          expect(settings.plugins[4].name).to.be('pdf');
          expect(settings.plugins[4].archivePath).to.be('kibana/pdf');
          expect(settings.plugins[4].version).to.be('1.0.0');

          expect(settings.plugins[5].name).to.be('test-plugin');
          expect(settings.plugins[5].archivePath).to.be('kibana/test-plugin');
          expect(settings.plugins[5].version).to.be('1.0.0');
        });
      });

      it('throw an error if there is no kibana plugin', function () {
        return copyReplyFile('test_plugin_no_kibana.zip')
        .then(() => {
          return getPackData(settings, logger);
        })
        .then(shouldReject, (err) => {
          expect(err.message).to.match(/No kibana plugins found in archive/i);
        });
      });

      it('throw an error with a corrupt zip', function () {
        return copyReplyFile('corrupt.zip')
        .then(() => {
          return getPackData(settings, logger);
        })
        .then(shouldReject, (err) => {
          expect(err.message).to.match(/error retrieving/i);
        });
      });

      it('throw an error if there an invalid plugin name', function () {
        return copyReplyFile('invalid_name.zip')
        .then(() => {
          return getPackData(settings, logger);
        })
        .then(shouldReject, (err) => {
          expect(err.message).to.match(/invalid plugin name/i);
        });
      });

    });

  });

});
