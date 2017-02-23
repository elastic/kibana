describe('esArchiver createFormatArchiveStreams', () => {
  context('{ gzip: false }', () => {
    it('returns an array of streams');
    it('streams consume js values');
    it('streams produce buffers');
    it('product is valid JSON seperated by two newlines');
  });

  context('{ gzip: true }', () => {
    it('produces an array of streams');
    it('streams consume js values');
    it('streams produce buffers');
    it('product can be gunzipped');
    it('after gunzip, product is valid JSON seperated by two newlines');
  });

  context('defaults', () => {
    it('product is not gzipped');
  });
});
