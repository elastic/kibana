import { expect } from 'chai';
import getBucketsPath from '../../helpers/get_buckets_path';

describe('getBucketsPath', () => {

  const metrics = [
    { id: 1, type: 'derivative' },
    { id: 2, type: 'percentile', percent: '50' },
    { id: 3, type: 'percentile', percent: '20.0' },
    { id: 4, type: 'std_deviation', mode: 'raw' },
    { id: 5, type: 'std_deviation', mode: 'upper' },
    { id: 6, type: 'std_deviation', mode: 'lower' },
    { id: 7, type: 'sum_of_squares' },
    { id: 8, type: 'variance' },
    { id: 9, type: 'max' }
  ];

  it('return path for derivative', () => {
    expect(getBucketsPath(1, metrics)).to.equal('1[normalized_value]');
  });

  it('return path for percentile(50)', () => {
    expect(getBucketsPath(2, metrics)).to.equal('2[50.0]');
  });

  it('return path for percentile(20.0)', () => {
    expect(getBucketsPath(3, metrics)).to.equal('3[20.0]');
  });

  it('return path for std_deviation(raw)', () => {
    expect(getBucketsPath(4, metrics)).to.equal('4[std_deviation]');
  });

  it('return path for std_deviation(upper)', () => {
    expect(getBucketsPath(5, metrics)).to.equal('5[std_upper]');
  });

  it('return path for std_deviation(lower)', () => {
    expect(getBucketsPath(6, metrics)).to.equal('6[std_lower]');
  });

  it('return path for sum_of_squares', () => {
    expect(getBucketsPath(7, metrics)).to.equal('7[sum_of_squares]');
  });

  it('return path for variance', () => {
    expect(getBucketsPath(8, metrics)).to.equal('8[variance]');
  });

  it('return path for basic metric', () => {
    expect(getBucketsPath(9, metrics)).to.equal('9');
  });


});

