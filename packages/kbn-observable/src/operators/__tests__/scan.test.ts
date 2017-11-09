import { k$ } from '../../k$';
import { scan } from '../';
import { Subject } from '../../Subject';
import { collect } from '../../lib/collect';

test('completes when source completes', async () => {
  const subject = new Subject<string>();

  const observable = k$(subject)(
    scan((acc, val) => {
      return acc + val;
    }, 'foo')
  );
  const res = collect(observable);

  subject.next('bar');
  subject.next('baz');
  subject.complete();

  expect(await res).toEqual(['foobar', 'foobarbaz', 'C']);
});

test('injects index', async () => {
  const subject = new Subject<string>();

  const observable = k$(subject)(
    scan((acc, val, index) => {
      return acc + index;
    }, 'foo')
  );
  const res = collect(observable);

  subject.next('bar');
  subject.next('baz');
  subject.complete();

  expect(await res).toEqual(['foo0', 'foo01', 'C']);
});

test('completes if no values received', async () => {
  const subject = new Subject<string>();

  const observable = k$(subject)(
    scan((acc, val, index) => {
      return acc + val;
    }, 'foo')
  );
  const res = collect(observable);

  subject.complete();

  expect(await res).toEqual(['C']);
});
