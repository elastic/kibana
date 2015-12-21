const expect = require('expect.js');
const sinon = require('sinon');
const glob = require('glob');
const rimraf = require('rimraf');
const { join } = require('path');
const mkdirp = require('mkdirp');

const pluginLogger = require('../plugin_logger');
const extract = require('../plugin_extractor');
const pluginDownloader = require('../plugin_downloader');

describe('kibana cli', function () {

  describe('plugin extractor', function () {

    const testWorkingPath = join(__dirname, '.test.data');
    const tempArchiveFilePath = join(testWorkingPath, 'archive.part');
    let logger;
    let downloader;

    const settings = {
      workingPath: testWorkingPath,
      tempArchiveFile: tempArchiveFilePath
    };

    function shouldReject() {
      throw new Error('expected the promise to reject');
    }

    beforeEach(function () {
      logger = pluginLogger(false);
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
      rimraf.sync(testWorkingPath);
      mkdirp.sync(testWorkingPath);
      downloader = pluginDownloader(settings, logger);
    });

    afterEach(function () {
      logger.log.restore();
      logger.error.restore();
      rimraf.sync(testWorkingPath);
    });

    function copyReplyFile(filename) {
      const filePath = join(__dirname, 'replies', filename);
      const sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

      return downloader._downloadSingle(sourceUrl);
    }

    function shouldReject() {
      throw new Error('expected the promise to reject');
    }

    describe('extractArchive', function () {

      it('successfully extract a valid tarball', function () {
        return copyReplyFile('test_plugin_master.tar.gz')
        .then((data) => {
          return extract(settings, logger, data.archiveType);
        })
        .then(() => {
          const files = glob.sync('**/*', { cwd: testWorkingPath });
          const expected = [
            'archive.part',
            'README.md',
            'index.js',
            'package.json',
            'public',
            'public/app.js'
          ];
          expect(files.sort()).to.eql(expected.sort());
        });
      });

      it('successfully extract a valid zip', function () {
        return copyReplyFile('test_plugin_master.zip')
        .then((data) => {
          return extract(settings, logger, data.archiveType);
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

      it('throw an error when extracting a corrupt zip', function () {
        return copyReplyFile('corrupt.zip')
        .then((data) => {
          return extract(settings, logger, data.archiveType);
        })
        .then(shouldReject, (err) => {
          expect(err.message).to.match(/error extracting/i);
        });
      });

      it('throw an error when extracting a corrupt tarball', function () {
        return copyReplyFile('corrupt.tar.gz')
        .then((data) => {
          return extract(settings, logger, data.archiveType);
        })
        .then(shouldReject, (err) => {
          expect(err.message).to.match(/error extracting/i);
        });
      });

      it('throw an error when passed an unknown archive type', function () {
        return copyReplyFile('banana.jpg')
        .then((data) => {
          return extract(settings, logger, data.archiveType);
        })
        .then(shouldReject, (err) => {
          expect(err.message).to.match(/unsupported archive format/i);
        });
      });

    });

  });

});
