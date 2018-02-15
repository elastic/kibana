import { $from } from '../';
import { $fromCallback } from '../$fromCallback';
import { Subject } from '../../Subject';
import { collect } from '../../lib/collect';

test('returns raw value', async () => {
  const observable = $fromCallback(() => 'foo');
  const res = collect(observable);

  expect(await res).toEqual(['foo', 'C']);
});

test('if undefined is returned, completes immediatley', async () => {
  const observable = $fromCallback(() => undefined);
  const res = collect(observable);

  expect(await res).toEqual(['C']);
});

test('if null is returned, forwards it', async () => {
  const observable = $fromCallback(() => null);
  const res = collect(observable);

  expect(await res).toEqual([null, 'C']);
});

test('returns observable that completes immediately', async () => {
  const observable = $fromCallback(() => $from([1, 2, 3]));
  const res = collect(observable);

  expect(await res).toEqual([1, 2, 3, 'C']);
});

test('returns observable that completes later', () => {
  const subject = new Subject();

  const next = jest.fn();
  const error = jest.fn();
  const complete = jest.fn();

  $fromCallback(() => subject).subscribe(next, error, complete);

  expect(next).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();

  subject.next('foo');
  expect(next).toHaveBeenCalledTimes(1);
  expect(error).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();

  subject.complete();
  expect(error).not.toHaveBeenCalled();
  expect(complete).toHaveBeenCalledTimes(1);
});

test('handles early unsubscribe', () => {
  const subject = new Subject();

  const next = () => {};
  const sub = $fromCallback(() => subject).subscribe(next);

  subject.next('foo');

  expect((subject as any).observers.size).toEqual(1);
  sub.unsubscribe();
  expect((subject as any).observers.size).toEqual(0);
});
