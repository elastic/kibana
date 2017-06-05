import getValueBy from '../get_value_by';
import { expect } from 'chai';

describe('getValueBy(fn, data)', () => {
  it('returns max for getValueBy(\'max\', data) ', () => {
    const data = [
      [0, 5],
      [1, 3],
      [2, 4],
      [3, 6],
      [4, 5],
    ];
    expect(getValueBy('max', data)).to.equal(6);
  });
  it('returns 0 if data is not array', () => {
    const data = '1';
    expect(getValueBy('max', data)).to.equal(0);
  });
  it('returns value if data is number', () => {
    const data = 1;
    expect(getValueBy('max', data)).to.equal(1);
  });
});
