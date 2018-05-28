import { reduce } from '../';
import { k$ } from '../../k';
import { collect } from '../../lib/collect';
import { Subject } from '../../subject';

test('completes when source completes', async () => {
  const subject = new Subject<string>();

  const observable = k$(subject)(
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

  const observable = k$(subject)(
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

  const observable = k$(subject)(
    reduce((acc, val, index) => {
      return acc + val;
    }, 'foo')
  );
  const res = collect(observable);
  subject.complete();

  expect(await res).toEqual(['foo', 'C']);
});
