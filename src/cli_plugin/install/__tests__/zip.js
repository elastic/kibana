import expect from 'expect.js';
import sinon from 'sinon';
import glob from 'glob';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';

import Logger from '../../lib/logger';
import { extract, readMetadata } from '../zip';
import { download, _downloadSingle }  from '../download';
import { join } from 'path';

describe('kibana cli', function () {

  describe('plugin extractor', function () {

    const testWorkingPath = join(__dirname, '.test.data');
    const tempArchiveFilePath = join(testWorkingPath, 'archive.part');
    let logger;

    const settings = {
      workingPath: testWorkingPath,
      tempArchiveFile: tempArchiveFilePath,
      plugin: 'test-plugin',
      setPlugin: function (plugin) {}
    };

    function shouldReject() {
      throw new Error('expected the promise to reject');
    }

    beforeEach(function () {
      logger = new Logger(settings);
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
      sinon.stub(settings, 'setPlugin');
      rimraf.sync(testWorkingPath);
      mkdirp.sync(testWorkingPath);
    });

    afterEach(function () {
      logger.log.restore();
      logger.error.restore();
      settings.setPlugin.restore();
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

    describe('extractArchive', function () {

      //Also only extracts the content from the kibana folder.
      //Ignores the others.
      it('successfully extract a valid zip', function () {
        return copyReplyFile('test_plugin.zip')
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

      it('throw an error with a corrupt zip', function () {
        return copyReplyFile('corrupt.zip')
        .then((data) => {
          return extract(settings, logger);
        })
        .then(shouldReject, (err) => {
          expect(err.message).to.match(/error extracting/i);
        });
      });

    });

    describe('readMetadata', function () {

      it('return the first folder name within the kibana folder', function () {
        return copyReplyFile('test_plugin.zip')
        .then(() => {
          return readMetadata(settings, logger);
        })
        .then(() => {
          const expected = 'test-plugin';
          expect(settings.setPlugin.calledWith(expected)).to.be(true);
        });
      });

      it('throw an error if there is no kibana plugin', function () {
        return copyReplyFile('test_plugin_no_kibana.zip')
        .then((data) => {
          return readMetadata(settings, logger);
        })
        .then(shouldReject, (err) => {
          expect(err.message).to.match(/No kibana plugins found in archive/i);
        });
      });

      it('throw an error with a corrupt zip', function () {
        return copyReplyFile('corrupt.zip')
        .then((data) => {
          return readMetadata(settings, logger);
        })
        .then(shouldReject, (err) => {
          expect(err.message).to.match(/error retrieving/i);
        });
      });

    });

  });

});
