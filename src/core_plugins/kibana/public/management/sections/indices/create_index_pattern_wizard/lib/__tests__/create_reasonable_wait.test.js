import { createReasonableWait } from '../create_reasonable_wait';
import sinon from 'sinon';

describe('createReasonableWait', () => {
  it('should eventually calls the callback', () => {
    const callback = sinon.spy();
    createReasonableWait(callback);
    expect(callback.notCalled).toBeTruthy();
  });
});
