import { resolve } from 'path';

import expect from 'expect.js';

import { File } from '../file';

const HERE = resolve(__dirname, __filename);

describe('dev/File', () => {
  describe('constructor', () => {
    it('throws if path is not a string', () => {
      expect(() => new File()).to.throwError();
      expect(() => new File(1)).to.throwError();
      expect(() => new File(false)).to.throwError();
      expect(() => new File(null)).to.throwError();
    });
  });

  describe('#getRelativePath()', () => {
    it('returns the path relative to the repo root', () => {
      const file = new File(HERE);
      expect(file.getRelativePath()).to.eql('src/dev/__tests__/file.js');
    });
  });

  describe('#isJs()', () => {
    it('returns true if extension is .js', () => {
      const file = new File('file.js');
      expect(file.isJs()).to.eql(true);
    });
    it('returns false if extension is .xml', () => {
      const file = new File('file.xml');
      expect(file.isJs()).to.eql(false);
    });
    it('returns false if extension is .css', () => {
      const file = new File('file.css');
      expect(file.isJs()).to.eql(false);
    });
    it('returns false if extension is .html', () => {
      const file = new File('file.html');
      expect(file.isJs()).to.eql(false);
    });
    it('returns false if file has no extension', () => {
      const file = new File('file');
      expect(file.isJs()).to.eql(false);
    });
  });

  describe('#getRelativeParentDirs()', () => {
    it('returns the parents of a file, stopping at the repo root, in descending order', () => {
      const file = new File(HERE);
      expect(file.getRelativeParentDirs()).to.eql([
        'src/dev/__tests__',
        'src/dev',
        'src',
      ]);
    });
  });

  describe('#toString()', () => {
    it('returns the relativePath', () => {
      const file = new File(HERE);
      expect(file.toString()).to.eql(file.getRelativePath());
    });
  });

  describe('#toJSON()', () => {
    it('returns the relativePath', () => {
      const file = new File(HERE);
      expect(file.toJSON()).to.eql(file.getRelativePath());
    });
  });
});
