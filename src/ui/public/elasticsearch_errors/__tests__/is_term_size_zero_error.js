import expect from 'expect.js';
import { isTermSizeZeroError } from '../is_term_size_zero_error';

describe('isTermSizeZeroError', () => {
  const identifyingString = 'size must be positive, got 0';

  it('returns true if it contains the identifying string', () => {
    const error = {
      resp: {
        error: {
          root_cause: [{
            reason: `Some crazy Java exception: ${identifyingString}`,
          }],
        }
      }
    };
    expect(isTermSizeZeroError(error)).to.be(true);
  });

  it(`returns false if it doesn't contain the identifying string`, () => {
    const error = {
      resp: {
        error: {
          root_cause: [{
            reason: `Some crazy Java exception`,
          }],
        }
      }
    };
    expect(isTermSizeZeroError(error)).to.be(false);
  });

  it ('returns false for non-elasticsearch error input', () => {
    expect(isTermSizeZeroError({ foo: 'bar' })).to.be(false);
  });
});
