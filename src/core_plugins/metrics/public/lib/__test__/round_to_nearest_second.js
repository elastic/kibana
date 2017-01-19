import { expect } from 'chai';
import roundToNearestSecond from '../round_to_nearest_second';

describe('roundToNearestSecond(value, percision, dir)', () => {

  it('returns ceil nearest second', () => {
    expect(roundToNearestSecond(1999, 1, 'ceil')).to.equal(2000);
  });

  it('returns floor nearest second', () => {
    expect(roundToNearestSecond(1999, 1, 'floor')).to.equal(1000);
  });

});
