import { Observable } from '../../Observable';
import { k$ } from '../../k$';
import { $from } from '../../factories';
import { map, toArray, toPromise } from '../';

const number$ = $from([1, 2, 3]);
const collect = <T>(source: Observable<T>) =>
  k$(source)(toArray(), toPromise());

test('returns the modified value', async () => {
  const numbers = await collect(k$(number$)(map(n => n * 1000)));

  expect(numbers).toEqual([1000, 2000, 3000]);
});

test('sends the index as arg 2', async () => {
  const numbers = await collect(k$(number$)(map((n, i) => i)));

  expect(numbers).toEqual([0, 1, 2]);
});
