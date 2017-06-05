import { expect } from 'chai';
import calculateBarWidth from '../calculate_bar_width';

describe('calculateBarWidth(series, divisor, multipier)', () => {

  it('returns default bar width', () => {
    const series = [{ data: [[100, 100], [200, 100]] }];
    expect(calculateBarWidth(series)).to.equal(70);
  });

  it('returns custom bar width', () => {
    const series = [{ data: [[100, 100], [200, 100]] }];
    expect(calculateBarWidth(series, 2)).to.equal(200);
  });

});


