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
  const parallelize = parallelizeBatches(batches, obj => {
    obj.called = true;
    return obj.promise;
  });

  const completed = [];
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

test('rejects if any promise rejects', async () => {
  const foo = createPromiseWithResolve();
  const bar = createPromiseWithResolve();
  const baz = createPromiseWithResolve();

  const batches = [[foo, bar], [baz]];
  const parallelize = parallelizeBatches(batches, obj => obj.promise);

  const completed = [];
  const failed = [];
  parallelize.then(
    () => {
      completed.push('parallelizeBatches');
    },
    () => {
      failed.push('parallelizeBatches');
    }
  );

  foo.reject();
  await tick();

  expect(completed).toEqual([]);
  expect(failed).toEqual(['parallelizeBatches']);
});

function createPromiseWithResolve() {
  let resolve;
  let reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve, reject, called: false };
}
