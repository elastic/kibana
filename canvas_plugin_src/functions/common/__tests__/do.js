import expect from 'expect.js';
import { doFn } from '../do';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('do', () => {
  const fn = functionWrapper(doFn);

  it('should only pass context', () => {
    expect(fn(1, { _: '1' })).to.equal(1);
    expect(fn(true, {})).to.equal(true);
    expect(fn(null, {})).to.equal(null);
    expect(fn(null, { _: 'not null' })).to.equal(null);
  });
});
