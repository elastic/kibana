import { reduce } from './reduce';
import { Subject } from '../subjects';
import { collect } from '../lib/collect';

test('completes when source completes', async () => {
  const subject = new Subject<string>();

  const observable = subject.pipe(
    reduce((acc, val) => {
      return acc + val;
    }, 'foo')
  );
  const res = collect(observable);

  subject.next('bar');
  subject.next('baz');
  subject.complete();

  expect(await res).toEqual(['foobarbaz', 'C']);
});

test('injects index', async () => {
  const subject = new Subject<string>();

  const observable = subject.pipe(
    reduce((acc, val, index) => {
      return acc + index;
    }, 'foo')
  );
  const res = collect(observable);

  subject.next('bar');
  subject.next('baz');
  subject.complete();

  expect(await res).toEqual(['foo01', 'C']);
});

test('completes with initial value if no values received', async () => {
  const subject = new Subject<string>();

  const observable = subject.pipe(
    reduce((acc, val) => {
      return acc + val;
    }, 'foo')
  );
  const res = collect(observable);
  subject.complete();

  expect(await res).toEqual(['foo', 'C']);
});

test('errors if projection errors', async () => {
  const subject = new Subject<string>();
  const error = new Error('baz');

  const observable = subject.pipe(
    reduce((acc, val) => {
      if (val === 'baz') {
        throw error;
      }
      return val;
    }, 'foo')
  );
  const res = collect(observable);

  subject.next('bar');
  subject.next('baz');
  subject.complete();

  expect(await res).toEqual([error]);
});
