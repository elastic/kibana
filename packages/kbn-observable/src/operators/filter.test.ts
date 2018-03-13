import { $of } from '../factories';
import { filter } from './filter';
import { collect } from '../lib/collect';

const number$ = $of(1, 2, 3);

test('returns the filtered values', async () => {
  const filter$ = number$.pipe(filter(n => n > 1));

  const res = collect(filter$);
  expect(await res).toEqual([2, 3, 'C']);
});

test('sends the index as arg 2', async () => {
  const filter$ = number$.pipe(filter((n, i) => i > 1));

  const res = collect(filter$);
  expect(await res).toEqual([3, 'C']);
});
