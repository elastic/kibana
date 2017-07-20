import { search } from '../search';
import expect from 'expect.js';

describe('server/indices/service/lib/search', () => {
  it('get indices as expected', async function () {
    const callCluster = () => {
      return new Promise((resolve) => {
        resolve({
          status: 200,
          aggregations: {
            indices: {
              buckets: [
                {
                  key: 'foo',
                  doc_count: 1
                },
                {
                  key: 'bar',
                  doc_count: 2
                }
              ]
            }
          }
        });
      });
    };

    const indices = await search(callCluster);
    expect(indices.length).to.be(2);
    expect(indices[0]).to.eql({ name: 'foo', docCount: 1 });
    expect(indices[1]).to.eql({ name: 'bar', docCount: 2 });
  });

  it('should return an empty array if there is a 404', async () => {
    const callCluster = () => {
      return new Promise((resolve) => {
        resolve({
          status: 404
        });
      });
    };

    const indices = await search(callCluster);
    expect(indices.length).to.be(0);
  });

  it('should return an empty array if there are no aggregations found', async () => {
    const callCluster = () => {
      return new Promise((resolve) => {
        resolve({
          status: 200
        });
      });
    };

    const indices = await search(callCluster);
    expect(indices.length).to.be(0);
  });
});
