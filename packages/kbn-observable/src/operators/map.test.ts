import { Observable } from '../observable';
import { $of } from '../factories';
import { map } from './map';
import { toArray } from './to_array';

const number$ = $of(1, 2, 3);
const collect = <T>(source: Observable<T>) =>
  source.pipe(toArray()).toPromise();

test('returns the modified value', async () => {
  const numbers = await collect(number$.pipe(map(n => n * 1000)));

  expect(numbers).toEqual([1000, 2000, 3000]);
});

test('sends the index as arg 2', async () => {
  const numbers = await collect(number$.pipe(map((n, i) => i)));

  expect(numbers).toEqual([0, 1, 2]);
});
