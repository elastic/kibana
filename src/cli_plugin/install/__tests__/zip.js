import expect from 'expect.js';
import rimraf from 'rimraf';
import path from 'path';
import os from 'os';
import glob from 'glob';
import { analyzeArchive, extractArchive } from '../zip';

describe('kibana cli', function () {

  describe('zip', function () {
    const repliesPath = path.resolve(__dirname, './replies');
    const archivePath = path.resolve(repliesPath, 'test_plugin.zip');

    let tempPath;

    beforeEach(() => {
      const randomDir = Math.random().toString(36);
      tempPath = path.resolve(os.tmpdir(), randomDir);
    });

    afterEach(() => {
      rimraf.sync(tempPath);
    });

    describe('analyzeArchive', function () {
      it('returns array of plugins', async () => {
        const packages = await analyzeArchive(archivePath);
        const plugin = packages[0];

        expect(packages).to.be.an(Array);
        expect(plugin.name).to.be('test-plugin');
        expect(plugin.archivePath).to.be('kibana/test-plugin');
        expect(plugin.archive).to.be(archivePath);
        expect(plugin.kibanaVersion).to.be('1.0.0');
      });
    });

    describe('extractArchive', () => {
      it('extracts files using the extractPath filter', async () => {
        await extractArchive(archivePath, tempPath, 'kibana/test-plugin');
        const files = await glob.sync('**/*', { cwd: tempPath });

        const expected = [
          'extra file only in zip.txt',
          'index.js',
          'package.json',
          'public',
          'public/app.js',
          'README.md'
        ];
        expect(files.sort()).to.eql(expected.sort());
      });
    });

    it('handles a corrupt zip archive', async (done) => {
      try {
        await extractArchive(path.resolve(repliesPath, 'corrupt.zip'));
        done(false);
      } catch(e) {
        done();
      }
    });
  });

});
