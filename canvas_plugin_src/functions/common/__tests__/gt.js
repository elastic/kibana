import expect from 'expect.js';
import { gt } from '../gt';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('gt', () => {
  const fn = functionWrapper(gt);

  it('should return false when the types are different', () => {
    expect(fn(1, { _: '1' })).to.be(false);
    expect(fn(true, { _: 'true' })).to.be(false);
    expect(fn(null, { _: 'null' })).to.be(false);
  });

  it('should return true when greater than', () => {
    expect(fn(2, { _: 1 })).to.be(true);
    expect(fn('foo', { _: 'bar' })).to.be(true);
    expect(fn(true, { _: false })).to.be(true);
  });

  it('should return false when less than or equal to', () => {
    expect(fn(1, { _: 2 })).to.be(false);
    expect(fn(2, { _: 2 })).to.be(false);
    expect(fn('bar', { _: 'foo' })).to.be(false);
    expect(fn('foo', { _: 'foo' })).to.be(false);
    expect(fn(false, { _: true })).to.be(false);
    expect(fn(true, { _: true })).to.be(false);
  });
});
