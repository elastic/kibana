import expect from 'expect.js';
import { eq } from '../eq';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('eq', () => {
  const fn = functionWrapper(eq);

  it('should return false when the types are different', () => {
    expect(fn(1, { _: '1' })).to.be(false);
    expect(fn(true, { _: 'true' })).to.be(false);
    expect(fn(null, { _: 'null' })).to.be(false);
  });

  it('should return false when the values are different', () => {
    expect(fn(1, { _: 2 })).to.be(false);
    expect(fn('foo', { _: 'bar' })).to.be(false);
    expect(fn(true, { _: false })).to.be(false);
  });

  it('should return true when the values are the same', () => {
    expect(fn(1, { _: 1 })).to.be(true);
    expect(fn('foo', { _: 'foo' })).to.be(true);
    expect(fn(true, { _: true })).to.be(true);
    expect(fn(null, { _: null })).to.be(true);
  });
});
