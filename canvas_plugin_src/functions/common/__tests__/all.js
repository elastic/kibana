import expect from 'expect.js';
import { all } from '../all';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('all', () => {
  const fn = functionWrapper(all);

  it('should return true with no conditions', () => {
    expect(fn(null, {})).to.be(true);
    expect(fn(null, { _: [] })).to.be(true);
  });

  it('should return true when all conditions are true', () => {
    expect(fn(null, { _: [true] })).to.be(true);
    expect(fn(null, { _: [true, true, true] })).to.be(true);
  });

  it('should return true when all conditions are truthy', () => {
    expect(fn(null, { _: [true, 1, 'hooray', {}] })).to.be(true);
  });

  it('should return false when at least one condition is false', () => {
    expect(fn(null, { _: [false, true, true] })).to.be(false);
    expect(fn(null, { _: [false, false, true] })).to.be(false);
    expect(fn(null, { _: [false, false, false] })).to.be(false);
  });

  it('should return false when at least one condition is falsy', () => {
    expect(fn(null, { _: [true, 0, 'hooray', {}] })).to.be(false);
    expect(fn(null, { _: [true, 1, 'hooray', null] })).to.be(false);
    expect(fn(null, { _: [true, 1, '', {}] })).to.be(false);
  });
});
