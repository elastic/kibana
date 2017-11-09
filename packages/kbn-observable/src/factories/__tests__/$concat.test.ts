import { $concat } from '../';
import { Subject } from '../../Subject';
import { collect } from '../../lib/collect';

test('continous on next observable when previous completes', async () => {
  const a = new Subject();
  const b = new Subject();

  const observable = $concat(a, b);
  const res = collect(observable);

  a.next('a1');
  b.next('b1');
  a.next('a2');
  a.complete();
  b.next('b2');
  b.complete();

  expect(await res).toEqual(['a1', 'a2', 'b2', 'C']);
});

test('errors when any observable errors', async () => {
  const a = new Subject();
  const b = new Subject();

  const observable = $concat(a, b);
  const res = collect(observable);

  const error = new Error('fail');
  a.next('a1');
  a.error(error);

  expect(await res).toEqual(['a1', error]);
});

test('handles early unsubscribe', () => {
  const a = new Subject();
  const b = new Subject();

  const next = jest.fn();
  const complete = jest.fn();
  const sub = $concat(a, b).subscribe({ next, complete });

  a.next('a1');
  sub.unsubscribe();
  a.next('a2');
  a.complete();
  b.next('b1');
  b.complete();

  expect(next).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenCalledWith('a1');
  expect(complete).toHaveBeenCalledTimes(0);
});
