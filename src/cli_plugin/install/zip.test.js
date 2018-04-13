import rimraf from 'rimraf';
import path from 'path';
import os from 'os';
import glob from 'glob';
import { analyzeArchive, extractArchive, _isDirectory } from './zip';

describe('kibana cli', function () {

  describe('zip', function () {
    const repliesPath = path.resolve(__dirname, '__fixtures__', 'replies');
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

        expect(packages).toBeInstanceOf(Array);
        expect(plugin.name).toBe('test-plugin');
        expect(plugin.archivePath).toBe('kibana/test-plugin');
        expect(plugin.archive).toBe(archivePath);
        expect(plugin.kibanaVersion).toBe('1.0.0');
      });
    });

    describe('extractArchive', () => {
      it('extracts files using the extractPath filter', async () => {
        const archive = path.resolve(repliesPath, 'test_plugin_many.zip');

        await extractArchive(archive, tempPath, 'kibana/test-plugin');
        const files = await glob.sync('**/*', { cwd: tempPath });

        const expected = [
          'extra file only in zip.txt',
          'index.js',
          'package.json',
          'public',
          'public/app.js',
          'README.md'
        ];
        expect(files.sort()).toEqual(expected.sort());
      });
    });

    it('handles a corrupt zip archive', async () => {
      try {
        await extractArchive(path.resolve(repliesPath, 'corrupt.zip'));
        throw new Error('This should have failed');
      } catch(e) {
        return;
      }
    });
  });

  describe('_isDirectory', () => {
    it('should check for a forward slash', () => {
      expect(_isDirectory('/foo/bar/')).toBe(true);
    });

    it('should check for a backslash', () => {
      expect(_isDirectory('\\foo\\bar\\')).toBe(true);
    });

    it('should return false for files', () => {
      expect(_isDirectory('foo.txt')).toBe(false);
      expect(_isDirectory('\\path\\to\\foo.txt')).toBe(false);
      expect(_isDirectory('/path/to/foo.txt')).toBe(false);
    });
  });

});
