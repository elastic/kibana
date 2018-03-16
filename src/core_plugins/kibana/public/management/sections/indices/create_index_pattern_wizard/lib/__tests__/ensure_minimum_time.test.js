import { ensureMinimumTime } from '../ensure_minimum_time';

describe('ensureMinimumTime', () => {
  it('resolves single promise', async (done) => {
    const promiseA = new Promise(resolve => resolve('a'));
    const a = await ensureMinimumTime(promiseA, 0);
    expect(a).toBe('a');
    done();
  });

  it('resolves multiple promises', async (done) => {
    const promiseA = new Promise(resolve => resolve('a'));
    const promiseB = new Promise(resolve => resolve('b'));
    const [ a, b ] = await ensureMinimumTime([promiseA, promiseB], 0);
    expect(a).toBe('a');
    expect(b).toBe('b');
    done();
  });

  it('resolves in the amount of time provided, at minimum', async (done) => {
    const startTime = new Date().getTime();
    const promise = new Promise(resolve => resolve());
    // https://kibana-ci.elastic.co/job/elastic+kibana+6.x+multijob-intake/128/console
    // We're having periodic failures around the timing here. I'm not exactly sure
    // why it's not consistent but I'm going to add some buffer space here to
    // prevent these random failures
    await ensureMinimumTime(promise, 105);
    const endTime = new Date().getTime();
    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    done();
  });
});
