import expect from 'expect.js';
import { lt } from '../lt';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('lt', () => {
  const fn = functionWrapper(lt);

  it('should return false when the types are different', () => {
    expect(fn(1, { _: '1' })).to.be(false);
    expect(fn(true, { _: 'true' })).to.be(false);
    expect(fn(null, { _: 'null' })).to.be(false);
  });

  it('should return false when greater than or equal to', () => {
    expect(fn(2, { _: 1 })).to.be(false);
    expect(fn(2, { _: 2 })).to.be(false);
    expect(fn('foo', { _: 'bar' })).to.be(false);
    expect(fn('foo', { _: 'foo' })).to.be(false);
    expect(fn(true, { _: false })).to.be(false);
    expect(fn(true, { _: true })).to.be(false);
  });

  it('should return true when less than', () => {
    expect(fn(1, { _: 2 })).to.be(true);
    expect(fn('bar', { _: 'foo' })).to.be(true);
    expect(fn(false, { _: true })).to.be(true);
  });
});
