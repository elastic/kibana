import { createReasonableWait } from '../create_reasonable_wait';

describe('createReasonableWait', () => {
  it('resolves all promises passed to it', async () => {
    const promiseA = new Promise(resolve => resolve('a'));
    const promiseB = new Promise(resolve => resolve('b'));
    const [ a, b ] = await createReasonableWait(promiseA, promiseB);
    expect(a).toBe('a');
    expect(b).toBe('b');
  });
});
