import expect from 'expect.js';
import { neq } from '../neq';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('neq', () => {
  const fn = functionWrapper(neq);

  it('should return true when the types are different', () => {
    expect(fn(1, { _: '1' })).to.be(true);
    expect(fn(true, { _: 'true' })).to.be(true);
    expect(fn(null, { _: 'null' })).to.be(true);
  });

  it('should return true when the values are different', () => {
    expect(fn(1, { _: 2 })).to.be(true);
    expect(fn('foo', { _: 'bar' })).to.be(true);
    expect(fn(true, { _: false })).to.be(true);
  });

  it('should return false when the values are the same', () => {
    expect(fn(1, { _: 1 })).to.be(false);
    expect(fn('foo', { _: 'foo' })).to.be(false);
    expect(fn(true, { _: true })).to.be(false);
    expect(fn(null, { _: null })).to.be(false);
  });
});
