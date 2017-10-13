import { k$ } from '../../k$';
import { Subject } from '../../Subject';
import { toPromise } from '../';

// Promises are always async, so we add a simple helper that we can `await` to
// make sure they have completed.
const tick = () => Promise.resolve();

test('returns the last value', async () => {
  const values$ = new Subject();

  const resolved = jest.fn();
  const rejected = jest.fn();

  k$(values$)(toPromise()).then(resolved, rejected);

  values$.next('foo');
  await tick();

  expect(resolved).not.toHaveBeenCalled();
  expect(rejected).not.toHaveBeenCalled();

  values$.next('bar');
  await tick();

  expect(resolved).not.toHaveBeenCalled();
  expect(rejected).not.toHaveBeenCalled();

  values$.complete();
  await tick();

  expect(resolved).toHaveBeenCalledTimes(1);
  expect(resolved).toHaveBeenCalledWith('bar');
  expect(rejected).not.toHaveBeenCalled();
});

test('resolves even if no values received', async () => {
  const values$ = new Subject();

  const resolved = jest.fn();
  const rejected = jest.fn();

  k$(values$)(toPromise()).then(resolved, rejected);

  values$.complete();
  await tick();

  expect(rejected).not.toHaveBeenCalled();
  expect(resolved).toHaveBeenCalledTimes(1);
});

test('rejects if error received', async () => {
  const values$ = new Subject();

  const resolved = jest.fn();
  const rejected = jest.fn();

  k$(values$)(toPromise()).then(resolved, rejected);

  values$.error(new Error('fail'));
  await tick();

  expect(resolved).not.toHaveBeenCalled();
  expect(rejected).toHaveBeenCalledTimes(1);
  expect(rejected.mock.calls).toMatchSnapshot();
});
