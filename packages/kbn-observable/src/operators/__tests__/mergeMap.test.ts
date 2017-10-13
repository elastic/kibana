import { Observable } from '../../Observable';
import { k$ } from '../../k$';
import { Subject } from '../../Subject';
import { mergeMap, map } from '../';
import { $of, $error } from '../../factories';
import { collect } from '../../lib/collect';

const tickMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('should mergeMap many outer values to many inner values', async () => {
  const inner$ = new Subject();

  const outer$ = Observable.from([1, 2, 3, 4]);
  const project = (value: number) => k$(inner$)(map(x => `${value}-${x}`));

  const observable = k$(outer$)(mergeMap(project));
  const res = collect(observable);

  await tickMs(10);
  inner$.next('a');

  await tickMs(10);
  inner$.next('b');

  await tickMs(10);
  inner$.next('c');

  inner$.complete();

  expect(await res).toEqual([
    '1-a',
    '2-a',
    '3-a',
    '4-a',
    '1-b',
    '2-b',
    '3-b',
    '4-b',
    '1-c',
    '2-c',
    '3-c',
    '4-c',
    'C'
  ]);
});

test('should mergeMap many outer values to many inner values, early complete', async () => {
  const outer$ = new Subject();
  const inner$ = new Subject();

  const project = (value: number) => k$(inner$)(map(x => `${value}-${x}`));

  const observable = k$(outer$)(mergeMap(project));
  const res = collect(observable);

  outer$.next(1);
  outer$.next(2);
  outer$.complete();

  // This shouldn't end up in the results because `outer$` has completed.
  outer$.next(3);

  await tickMs(5);
  inner$.next('a');

  await tickMs(5);
  inner$.next('b');

  await tickMs(5);
  inner$.next('c');

  inner$.complete();

  expect(await res).toEqual(['1-a', '2-a', '1-b', '2-b', '1-c', '2-c', 'C']);
});

test('should mergeMap many outer to many inner, and inner throws', async () => {
  const source = Observable.from([1, 2, 3, 4]);
  const error = new Error('fail');

  const project = (value: number, index: number) =>
    index > 1 ? $error(error) : $of(value);

  const observable = k$(source)(mergeMap(project));
  const res = collect(observable);

  expect(await res).toEqual([1, 2, error]);
});

test('should mergeMap many outer to many inner, and outer throws', async () => {
  const outer$ = new Subject();
  const inner$ = new Subject();

  const project = (value: number) => k$(inner$)(map(x => `${value}-${x}`));

  const observable = k$(outer$)(mergeMap(project));
  const res = collect(observable);

  outer$.next(1);
  outer$.next(2);

  const error = new Error('outer fails');

  await tickMs(5);
  inner$.next('a');

  await tickMs(5);
  inner$.next('b');

  outer$.error(error);
  // This shouldn't end up in the results because `outer$` has failed
  outer$.next(3);

  await tickMs(5);
  inner$.next('c');

  expect(await res).toEqual(['1-a', '2-a', '1-b', '2-b', error]);
});

test('should mergeMap many outer to an array for each value', async () => {
  const source = Observable.from([1, 2, 3]);

  const observable = k$(source)(mergeMap(() => $of('a', 'b', 'c')));
  const res = collect(observable);

  expect(await res).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c', 'C']);
});

test('should mergeMap many outer to inner arrays, using resultSelector', async () => {
  expect.assertions(1);

  const source = Observable.from([1, 2, 3]);
  const project = (num: number, str: string) => `${num}/${str}`;

  const observable = k$(source)(mergeMap(() => $of('a', 'b', 'c'), project));
  const res = collect(observable);

  expect(await res).toEqual([
    '1/a',
    '1/b',
    '1/c',
    '2/a',
    '2/b',
    '2/c',
    '3/a',
    '3/b',
    '3/c',
    'C'
  ]);
});
