import expect from 'expect.js';
import { SearchCache } from '../search_cache';

describe(`SearchCache`, () => {

  /**
   * msearch returns combined Nth and N+1 th value as result
   * @type {{search(*): Promise<*>}}
   */
  class FauxEs {
    constructor() {
      // contains all request batches, separated by 0
      this.searches = [];
    }

    async msearch(request) {
      const req = request.body;
      const responses = [];
      for (let i = 0; i < req.length; i += 2) {
        const res = { ind: req[i], bod: req[i + 1] };
        responses.push(res);
        this.searches.push(res);
      }
      this.searches.push(0);
      return { responses };
    }
  }

  const request1 = { meta: 'm1', body: 'b1' };
  const expected1 = { ind: 'm1', bod: 'b1' };
  const request2 = { meta: 'm2', body: 'b2' };
  const expected2 = { ind: 'm2', bod: 'b2' };
  const request3 = { meta: 'm3', body: 'b3' };
  const expected3 = { ind: 'm3', bod: 'b3' };

  it(`sequence`, async () => {
    const sc = new SearchCache(new FauxEs());

    // empty request
    let res = await sc.search([]);
    expect(res).to.eql([]);
    expect(sc._es.searches).to.eql([]);

    // single request
    res = await sc.search([request1]);
    expect(res).to.eql([expected1]);
    expect(sc._es.searches).to.eql([expected1, 0]);

    // repeat the same search, use array notation
    res = await sc.search([request1]);
    expect(res).to.eql([expected1]);
    expect(sc._es.searches).to.eql([expected1, 0]); // no new entries

    // new single search
    res = await sc.search([request2]);
    expect(res).to.eql([expected2]);
    expect(sc._es.searches).to.eql([expected1, 0, expected2, 0]);

    // multiple search, some new, some old
    res = await sc.search([request1, request3, request2]);
    expect(res).to.eql([expected1, expected3, expected2]);
    expect(sc._es.searches).to.eql([expected1, 0, expected2, 0, expected3, 0]);
  });

});
