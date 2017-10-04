import { expect } from 'chai';
import getLastValue from '../get_last_value';

describe('getLastValue(data)', () => {

  it('returns zero if data is not array', () => {
    expect(getLastValue('foo')).to.equal(0);
  });

  it('returns the last value', () => {
    const data = [[1,1]];
    expect(getLastValue(data)).to.equal(1);
  });

  it('returns the second to last value if the last value is null (default)', () => {
    const data = [[1,4], [2, null]];
    expect(getLastValue(data)).to.equal(4);
  });

  it('returns the zero if second to last is null (default)', () => {
    const data = [[1, null], [2, null]];
    expect(getLastValue(data)).to.equal(0);
  });

  it('returns the N to last value if the last N-1 values are null (default)', () => {
    const data = [[1,4], [2, null], [3, null]];
    expect(getLastValue(data, 3)).to.equal(4);
  });


});

