import expect from 'expect.js';
import typeFromFilename, { ZIP, TAR } from '../type_from_filename';

describe('kibana cli', function () {
  describe('type_from_filename', function () {
    it('returns ZIP for .zip filename', function () {
      const type = typeFromFilename('wat.zip');
      expect(type).to.equal(ZIP);
    });
    it('returns TAR for .tar.gz filename', function () {
      const type = typeFromFilename('wat.tar.gz');
      expect(type).to.equal(TAR);
    });
    it('returns TAR for .tgz filename', function () {
      const type = typeFromFilename('wat.tgz');
      expect(type).to.equal(TAR);
    });
    it('returns undefined for unknown file type', function () {
      const type = typeFromFilename('wat.unknown');
      expect(type).to.equal(undefined);
    });
    it('accepts paths', function () {
      const type = typeFromFilename('/some/path/to/wat.zip');
      expect(type).to.equal(ZIP);
    });
    it('accepts urls', function () {
      const type = typeFromFilename('http://example.com/wat.zip');
      expect(type).to.equal(ZIP);
    });
  });
});
