import expect from 'expect.js';
import fileType, { ZIP, TAR } from '../file_type';

describe('kibana cli', function () {
  describe('file_type', function () {
    it('returns ZIP for .zip filename', function () {
      const type = fileType('wat.zip');
      expect(type).to.equal(ZIP);
    });
    it('returns TAR for .tar.gz filename', function () {
      const type = fileType('wat.tar.gz');
      expect(type).to.equal(TAR);
    });
    it('returns TAR for .tgz filename', function () {
      const type = fileType('wat.tgz');
      expect(type).to.equal(TAR);
    });
    it('returns undefined for unknown file type', function () {
      const type = fileType('wat.unknown');
      expect(type).to.equal(undefined);
    });
    it('accepts paths', function () {
      const type = fileType('/some/path/to/wat.zip');
      expect(type).to.equal(ZIP);
    });
    it('accepts urls', function () {
      const type = fileType('http://example.com/wat.zip');
      expect(type).to.equal(ZIP);
    });
  });
});
