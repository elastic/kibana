import expect from 'expect.js';
import { any } from '../any';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('any', () => {
  const fn = functionWrapper(any);

  it('should return false with no conditions', () => {
    expect(fn(null, {})).to.be(false);
    expect(fn(null, { _: [] })).to.be(false);
  });

  it('should return false when no conditions are true', () => {
    expect(fn(null, null, { _: [false] })).to.be(false);
    expect(fn(null, { _: [false, false, false] })).to.be(false);
  });

  it('should return false when all conditions are falsy', () => {
    expect(fn(null, { _: [false, 0, '', null] })).to.be(false);
  });

  it('should return true when at least one condition is true', () => {
    expect(fn(null, { _: [false, false, true] })).to.be(true);
    expect(fn(null, { _: [false, true, true] })).to.be(true);
    expect(fn(null, { _: [true, true, true] })).to.be(true);
  });

  it('should return true when at least one condition is truthy', () => {
    expect(fn(null, { _: [false, 0, '', null, 1] })).to.be(true);
    expect(fn(null, { _: [false, 0, 'hooray', null] })).to.be(true);
    expect(fn(null, { _: [false, 0, {}, null] })).to.be(true);
  });
});
