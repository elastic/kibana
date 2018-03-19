import expect from 'expect.js';
import { TimeCache } from '../time_cache';

describe(`TimeCache`, () => {

  class FauxTimefilter {
    constructor(min, max) {
      // logs all requests
      this.searches = [];
      this.time = {};
      this.setTime(min, max);
      this._accessCount = 0;
    }

    setTime(min, max) {
      this._min = min;
      this._max = max;
    }

    calculateBounds() {
      this._accessCount++;
      return {
        min: { valueOf: () => this._min },
        max: { valueOf: () => this._max },
      };
    }
  }

  class FauxTime {
    constructor() {
      this._time = 10000;
      this._accessCount = 0;
    }

    now() {
      this._accessCount++;
      return this._time;
    }

    increment(inc) {
      this._time += inc;
    }
  }

  it(`sequence`, async () => {
    const timefilter = new FauxTimefilter(10000, 20000, 'quick');
    const tc = new TimeCache(timefilter, 5000);
    const time = new FauxTime();
    tc._now = () => time.now();

    let timeAccess = 0;
    let filterAccess = 0;

    // first call - gets bounds
    expect(tc.getTimeBounds()).to.eql({ min: 10000, max: 20000 });
    expect(time._accessCount).to.be(++timeAccess);
    expect(timefilter._accessCount).to.be(++filterAccess);

    // short diff, same result
    time.increment(10);
    timefilter.setTime(10010, 20010);
    expect(tc.getTimeBounds()).to.eql({ min: 10000, max: 20000 });
    expect(time._accessCount).to.be(++timeAccess);
    expect(timefilter._accessCount).to.be(filterAccess);

    // longer diff, gets bounds but returns original
    time.increment(200);
    timefilter.setTime(10210, 20210);
    expect(tc.getTimeBounds()).to.eql({ min: 10000, max: 20000 });
    expect(time._accessCount).to.be(++timeAccess);
    expect(timefilter._accessCount).to.be(++filterAccess);

    // long diff, new result
    time.increment(10000);
    timefilter.setTime(20220, 30220);
    expect(tc.getTimeBounds()).to.eql({ min: 20220, max: 30220 });
    expect(time._accessCount).to.be(++timeAccess);
    expect(timefilter._accessCount).to.be(++filterAccess);

  });

});
