import expect from 'expect.js';
import { SearchCache } from '../search_cache';

describe(`SearchCache`, () => {

  class FauxEs {
    constructor() {
      // contains all request batches, separated by 0
      this.searches = [];
    }

    async search(request) {
      this.searches.push(request);
      return { req: request };
    }
  }

  const request1 = { body: 'b1' };
  const expected1 = { req: { body: 'b1' } };
  const request2 = { body: 'b2' };
  const expected2 = { req: { body: 'b2' } };
  const request3 = { body: 'b3' };
  const expected3 = { req: { body: 'b3' } };

  it(`sequence`, async () => {
    const sc = new SearchCache(new FauxEs());

    // empty request
    let res = await sc.search([]);
    expect(res).to.eql([]);
    expect(sc._es.searches).to.eql([]);

    // single request
    res = await sc.search([request1]);
    expect(res).to.eql([expected1]);
    expect(sc._es.searches).to.eql([request1]);

    // repeat the same search, use array notation
    res = await sc.search([request1]);
    expect(res).to.eql([expected1]);
    expect(sc._es.searches).to.eql([request1]); // no new entries

    // new single search
    res = await sc.search([request2]);
    expect(res).to.eql([expected2]);
    expect(sc._es.searches).to.eql([request1, request2]);

    // multiple search, some new, some old
    res = await sc.search([request1, request3, request2]);
    expect(res).to.eql([expected1, expected3, expected2]);
    expect(sc._es.searches).to.eql([request1, request2, request3]);
  });

});
