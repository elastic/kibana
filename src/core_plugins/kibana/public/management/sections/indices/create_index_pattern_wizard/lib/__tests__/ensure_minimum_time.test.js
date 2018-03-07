import { ensureMinimumTime } from '../ensure_minimum_time';

describe('ensureMinimumTime', () => {
  it('resolves single promise', async () => {
    const promiseA = new Promise(resolve => resolve('a'));
    const a = await ensureMinimumTime(promiseA);
    expect(a).toBe('a');
  });

  it('resolves multiple promises', async () => {
    const promiseA = new Promise(resolve => resolve('a'));
    const promiseB = new Promise(resolve => resolve('b'));
    const [ a, b ] = await ensureMinimumTime([promiseA, promiseB]);
    expect(a).toBe('a');
    expect(b).toBe('b');
  });
});
