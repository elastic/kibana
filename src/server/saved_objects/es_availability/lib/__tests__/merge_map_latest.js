import sinon from 'sinon';
import expect from 'expect.js';
import { delay } from 'bluebird';
import { Observable } from 'rxjs/Rx';

import { mergeMapLatest } from '../merge_map_latest';

describe('$.let(mergeMapLatest(fn))', () => {
  it('completes if it gets no events', async () => {
    await Observable
      .empty()
      .let(mergeMapLatest(input => `foo(${input})`))
      .toPromise();
  });

  it('waits for map to complete before processing next value', async () => {
    const mapFn = sinon.spy(async () => {
      await delay(100);
      return Date.now();
    });

    const result = await Observable
      .of(1,2)
      .let(mergeMapLatest(mapFn))
      .toArray()
      .toPromise();

    expect(result).to.be.an('array');
    expect(result).to.have.length(2);
    expect(result[0] + 100 <= result[1]).to.be.ok();
  });

  it('only sends the latest to the mergeMap', async () => {
    const mapFn = sinon.spy(async (input) => {
      await delay(100);
      return input;
    });

    const result = await Observable
      .of(1,2,3,4,5,6)
      .let(mergeMapLatest(mapFn))
      .toArray()
      .toPromise();

    expect(result).to.eql([1,6]);
  });
});
