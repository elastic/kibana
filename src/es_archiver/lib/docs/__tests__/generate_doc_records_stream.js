describe('esArchiver: createIndexDocRecordsStream()', () => {
  it('consumes doc records');
  it('uses `_bulk` requests to index multiple docs at a time');
  it('sends bulk request as soon as previous request is complete');
  it('sends a maximum of 1000 documents at a time');
  it('emits an error if any request fails');
});
