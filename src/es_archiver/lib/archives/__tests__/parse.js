describe('esArchiver createParseArchiveStreams', () => {
  context('{ gzip: false }', () => {
    it('returns an array of streams');

    describe('streams', () => {
      it('consume buffers');
      it('parses valid JSON');
      it('parses valid JSON seperated by two newlines');
      it('provides each JSON object as soon as it is parsed');
    });

    describe('stream errors', () => {
      it('stops when any document contains invalid json');
    });
  });

  context('{ gzip: true }', () => {
    it('returns an array of streams');

    describe('streams', () => {
      it('consume buffers');
      it('ungzips the content');
      it('parses valid gzipped JSON');
      it('parses valid gzipped JSON seperated by two newlines');
    });

    describe('stream errors', () => {
      it('stops when the input is not valid gzip archive');
    });
  });

  context('defaults', () => {
    it('does not try to gunzip the content');
  });
});
