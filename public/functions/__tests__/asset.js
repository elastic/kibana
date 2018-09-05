import expect from 'expect.js';
import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { asset } from '../asset';

describe('asset', () => {
  const fn = functionWrapper(asset);

  it('throws if asset could not be retrieved by ID', () => {
    const throwsErr = () => {
      return fn(null, { id: 'boo' });
    };
    expect(throwsErr).to.throwException(err => {
      expect(err.message).to.be('Could not get the asset by ID: boo');
    });
  });

  it('returns the asset for found asset ID', () => {
    expect(fn(null, { id: 'yay' })).to.be('here is your image');
  });
});
