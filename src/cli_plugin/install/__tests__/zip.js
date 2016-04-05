import expect from 'expect.js';
import sinon from 'sinon';
import glob from 'glob-all';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import Logger from '../../lib/logger';
import { _downloadSingle }  from '../download';
import { join } from 'path';
import { listFiles, extractFiles } from '../zip';

describe('kibana cli', function () {

  describe('zip', function () {

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

    describe('listFiles', function () {

      it('lists the files in the zip', function () {
        return copyReplyFile('test_plugin.zip')
        .then(() => {
          return listFiles(settings.tempArchiveFile);
        })
        .then((actual) => {
          const expected = [
            'elasticsearch/',
            'kibana/',
            'kibana/test-plugin/',
            'kibana/test-plugin/.gitignore',
            'kibana/test-plugin/extra file only in zip.txt',
            'kibana/test-plugin/index.js',
            'kibana/test-plugin/package.json',
            'kibana/test-plugin/public/',
            'kibana/test-plugin/public/app.js',
            'kibana/test-plugin/README.md',
            'logstash/'
          ];

          expect(actual).to.eql(expected);
        });
      });

    });

    describe('extractFiles', function () {

      it('extracts files using the files filter', function () {
        return copyReplyFile('test_plugin_many.zip')
        .then(() => {
          const filter = {
            files: [
              'kibana/funger-plugin/extra file only in zip.txt',
              'kibana/funger-plugin/index.js',
              'kibana\\funger-plugin\\package.json'
            ]
          };

          return extractFiles(settings.tempArchiveFile, settings.workingPath, 0, filter);
        })
        .then(() => {
          const files = glob.sync('**/*', { cwd: testWorkingPath });
          const expected = [
            'kibana',
            'kibana/funger-plugin',
            'kibana/funger-plugin/extra file only in zip.txt',
            'kibana/funger-plugin/index.js',
            'kibana/funger-plugin/package.json',
            'archive.part'
          ];
          expect(files.sort()).to.eql(expected.sort());
        });
      });

      it('extracts files using the paths filter', function () {
        return copyReplyFile('test_plugin_many.zip')
        .then(() => {
          const filter = {
            paths: [
              'kibana/funger-plugin',
              'kibana/test-plugin/public'
            ]
          };

          return extractFiles(settings.tempArchiveFile, settings.workingPath, 0, filter);
        })
        .then(() => {
          const files = glob.sync('**/*', { cwd: testWorkingPath });
          const expected = [
            'archive.part',
            'kibana',
            'kibana/funger-plugin',
            'kibana/funger-plugin/README.md',
            'kibana/funger-plugin/extra file only in zip.txt',
            'kibana/funger-plugin/index.js',
            'kibana/funger-plugin/package.json',
            'kibana/funger-plugin/public',
            'kibana/funger-plugin/public/app.js',
            'kibana/test-plugin',
            'kibana/test-plugin/public',
            'kibana/test-plugin/public/app.js'
          ];
          expect(files.sort()).to.eql(expected.sort());
        });
      });
    });

  });

});
