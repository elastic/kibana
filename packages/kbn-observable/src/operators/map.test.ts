import { $of } from '../factories';
import { map } from './map';
import { collect } from '../lib/collect';

const number$ = $of(1, 2, 3);

test('returns the modified value', async () => {
  const observable = number$.pipe(map(n => n * 1000));
  const numbers = await collect(observable);

  expect(numbers).toEqual([1000, 2000, 3000, 'C']);
});

test('sends the index as arg 2', async () => {
  const observable = number$.pipe(map((n, i) => i));
  const numbers = await collect(observable);

  expect(numbers).toEqual([0, 1, 2, 'C']);
});

test('errors if projection errors', async () => {
  const error = new Error('foo');

  const observable = number$.pipe(
    map(value => {
      if (value > 1) {
        throw error;
      }
      return value;
    })
  );
  const numbers = await collect(observable);

  expect(numbers).toEqual([1, error]);
});
