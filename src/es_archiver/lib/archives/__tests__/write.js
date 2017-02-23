describe('esArchiver createWriteArchiveStreams()', () => {
  context('.gz extension', () => {
    it('returns an array of streams');
    it('consumes js values and writes them to the path');
    it('produces a valid gzip archive');
    it('overwrites any existing file');
    it('creates the file it it does not exist');
  });

  context('not .gz extension', () => {
    it('returns an array of streams');
    it('consumes js values and writes them to the path');
    it('produces plain text content');
    it('overwrites any existing file');
    it('creates the file it it does not exist');
  });
});
