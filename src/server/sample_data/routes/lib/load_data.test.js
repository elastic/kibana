import { loadData } from './load_data';

test('load data', done => {
  let myDocsCount = 0;
  const bulkLoadMock = (docs) => {
    myDocsCount += docs.length;
  };
  loadData('./sample_data/flights.json.gz', bulkLoadMock, async (err, count) => {
    expect(myDocsCount).toBe(13059);
    expect(count).toBe(13059);
    done();
  });
});
