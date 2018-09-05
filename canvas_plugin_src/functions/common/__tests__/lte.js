import expect from 'expect.js';
import { lte } from '../lte';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('lte', () => {
  const fn = functionWrapper(lte);

  it('should return false when the types are different', () => {
    expect(fn(1, { _: '1' })).to.be(false);
    expect(fn(true, { _: 'true' })).to.be(false);
    expect(fn(null, { _: 'null' })).to.be(false);
  });

  it('should return false when greater than', () => {
    expect(fn(2, { _: 1 })).to.be(false);
    expect(fn('foo', { _: 'bar' })).to.be(false);
    expect(fn(true, { _: false })).to.be(false);
  });

  it('should return true when less than or equal to', () => {
    expect(fn(1, { _: 2 })).to.be(true);
    expect(fn(2, { _: 2 })).to.be(true);
    expect(fn('bar', { _: 'foo' })).to.be(true);
    expect(fn('foo', { _: 'foo' })).to.be(true);
    expect(fn(false, { _: true })).to.be(true);
    expect(fn(true, { _: true })).to.be(true);
  });
});
