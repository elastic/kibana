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

    const testWorkingPath = join(__dirname, '.test.data');
    const tempArchiveFilePath = join(testWorkingPath, 'archive.part');
    const testPluginPath = join(testWorkingPath, '.installedPlugins');
    let logger;

    const settings = {
      workingPath: testWorkingPath,
      tempArchiveFile: tempArchiveFilePath,
      pluginDir: testPluginPath,
      plugin: 'test-plugin'
    };

    beforeEach(function () {
      logger = new Logger(settings);
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
      rimraf.sync(testWorkingPath);
      mkdirp.sync(testWorkingPath);
    });

    afterEach(function () {
      logger.log.restore();
      logger.error.restore();
      rimraf.sync(testWorkingPath);
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
          expect(settings.plugins[0].folder).to.be('test-plugin');
          expect(settings.plugins[0].version).to.be('1.0.0');
          expect(settings.plugins[0].platform).to.be(undefined);
        });
      });

      it('populate settings.plugins with multiple plugins', function () {
        return copyReplyFile('test_plugin_many.zip')
        .then(() => {
          return getPackData(settings, logger);
        })
        .then(() => {
          expect(settings.plugins[0].name).to.be('funger-plugin');
          expect(settings.plugins[0].file).to.be('kibana/funger-plugin/package.json');
          expect(settings.plugins[0].folder).to.be('funger-plugin');
          expect(settings.plugins[0].version).to.be('1.0.0');
          expect(settings.plugins[0].platform).to.be(undefined);

          expect(settings.plugins[1].name).to.be('pdf');
          expect(settings.plugins[1].file).to.be('kibana/pdf-linux/package.json');
          expect(settings.plugins[1].folder).to.be('pdf-linux');
          expect(settings.plugins[1].version).to.be('1.0.0');
          expect(settings.plugins[1].platform).to.be('linux');

          expect(settings.plugins[2].name).to.be('pdf');
          expect(settings.plugins[2].file).to.be('kibana/pdf-win32/package.json');
          expect(settings.plugins[2].folder).to.be('pdf-win32');
          expect(settings.plugins[2].version).to.be('1.0.0');
          expect(settings.plugins[2].platform).to.be('win32');

          expect(settings.plugins[3].name).to.be('pdf');
          expect(settings.plugins[3].file).to.be('kibana/pdf-win64/package.json');
          expect(settings.plugins[3].folder).to.be('pdf-win64');
          expect(settings.plugins[3].version).to.be('1.0.0');
          expect(settings.plugins[3].platform).to.be('win64');

          expect(settings.plugins[4].name).to.be('pdf');
          expect(settings.plugins[4].file).to.be('kibana/pdf/package.json');
          expect(settings.plugins[4].folder).to.be('pdf');
          expect(settings.plugins[4].version).to.be('1.0.0');
          expect(settings.plugins[4].platform).to.be(undefined);

          expect(settings.plugins[5].name).to.be('test-plugin');
          expect(settings.plugins[5].file).to.be('kibana/test-plugin/package.json');
          expect(settings.plugins[5].folder).to.be('test-plugin');
          expect(settings.plugins[5].version).to.be('1.0.0');
          expect(settings.plugins[5].platform).to.be(undefined);
        });
      });

      it('throw an error if there is no kibana plugin', function () {
        return copyReplyFile('test_plugin_no_kibana.zip')
        .then((data) => {
          return getPackData(settings, logger);
        })
        .then(shouldReject, (err) => {
          expect(err.message).to.match(/No kibana plugins found in archive/i);
        });
      });

      it('throw an error with a corrupt zip', function () {
        return copyReplyFile('corrupt.zip')
        .then((data) => {
          return getPackData(settings, logger);
        })
        .then(shouldReject, (err) => {
          expect(err.message).to.match(/error retrieving/i);
        });
      });

      it('throw an error if there an invalid plugin name', function () {
        return copyReplyFile('invalid_name.zip')
        .then((data) => {
          return getPackData(settings, logger);
        })
        .then(shouldReject, (err) => {
          expect(err.message).to.match(/invalid plugin name/i);
        });
      });

    });

  });

});
