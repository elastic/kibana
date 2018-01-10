import { createReasonableWait } from '../create_reasonable_wait';
import sinon from 'sinon';

describe('createReasonableWait', () => {
  it('should eventually calls the callback', () => {
    const clock = sinon.useFakeTimers();
    const callback = sinon.spy();
    createReasonableWait(callback);
    clock.tick(500);
    expect(callback.calledOnce).toBeTruthy();
    clock.restore();
  });
});
