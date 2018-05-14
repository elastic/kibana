import { parallelizeBatches } from './parallelize';

// As promises resolve async, we use this helper to wait for all promises that
// have been resolved to complete (aka call `then`).
const tick = () =>
  new Promise(resolve => {
    setTimeout(resolve, 0);
  });

test('parallelizes batches', async () => {
  const foo = createPromiseWithResolve();
  const bar = createPromiseWithResolve();
  const baz = createPromiseWithResolve();

  const batches = [[foo, bar], [baz]];
  const parallelize = parallelizeBatches(batches, async obj => {
    obj.called = true;
    await obj.promise;
  });

  const completed: string[] = [];
  parallelize.then(() => {
    completed.push('parallelizeBatches');
  });
  foo.promise.then(() => {
    completed.push('foo');
  });
  bar.promise.then(() => {
    completed.push('bar');
  });
  baz.promise.then(() => {
    completed.push('baz');
  });

  expect(foo.called).toBe(true);
  expect(bar.called).toBe(true);
  expect(baz.called).toBe(false);
  expect(completed).toEqual([]);

  bar.resolve();
  await tick();

  expect(completed).toEqual(['bar']);
  expect(baz.called).toBe(false);

  foo.resolve();
  await tick();

  expect(completed).toEqual(['bar', 'foo']);
  expect(baz.called).toBe(true);

  baz.resolve();
  await tick();

  expect(completed).toEqual(['bar', 'foo', 'baz', 'parallelizeBatches']);
});

test('schedules at most 4 calls at the same time (concurrency)', async () => {
  const foo = createPromiseWithResolve();
  const bar = createPromiseWithResolve();
  const baz = createPromiseWithResolve();
  const quux = createPromiseWithResolve();
  const foobar = createPromiseWithResolve();

  const batches = [[foo, bar, baz, quux, foobar]];
  const parallelize = parallelizeBatches(batches, async obj => {
    obj.called = true;
    await obj.promise;
  });

  expect(foo.called).toBe(true);
  expect(bar.called).toBe(true);
  expect(baz.called).toBe(true);
  expect(quux.called).toBe(true);
  expect(foobar.called).toBe(false);

  foo.resolve();
  await tick();

  expect(foobar.called).toBe(true);

  bar.resolve();
  baz.resolve();
  quux.resolve();
  foobar.resolve();
  await tick();

  await expect(parallelize).resolves.toBe(undefined);
});

test('rejects if any promise rejects', async () => {
  const foo = createPromiseWithResolve();
  const bar = createPromiseWithResolve();
  const baz = createPromiseWithResolve();

  const batches = [[foo, bar], [baz]];
  const parallelize = parallelizeBatches(batches, async obj => {
    await obj.promise;
  });

  foo.reject(new Error('foo failed'));

  await expect(parallelize).rejects.toThrow('foo failed');
});

function createPromiseWithResolve() {
  let resolve: (val?: any) => void;
  let reject: (err?: any) => void;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve: resolve!, reject: reject!, called: false };
}
