describe('esArchiver: createGenerateDocRecordsStream()', () => {
  it('scolls 1000 documents at a time');
  it('uses a 1 minute scroll timeout');
  it('consumes index names and scrolls completely before continuing');
  it('produces well formed doc records');
  it('records an `archivedDoc` stat for each document');
});
