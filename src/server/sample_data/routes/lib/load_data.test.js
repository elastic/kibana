import { loadData } from './load_data';

test('load data', done => {
  let myDocsCount = 0;
  const bulkInsertMock = (docs) => {
    myDocsCount += docs.length;
  };
  loadData('./src/server/sample_data/data_sets/flights/flights.json.gz', bulkInsertMock, async (err, count) => {
    expect(myDocsCount).toBe(13059);
    expect(count).toBe(13059);
    done();
  });
});
