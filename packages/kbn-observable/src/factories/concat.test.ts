import { $concat } from './concat';
import { Subject } from '../subjects';
import { collect, createCollectObserver } from '../lib/collect';
import { trackSubscriptions } from '../lib/track_subscriptions';

test('continue on next observable when previous completes', async () => {
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

  const values: any[] = [];
  const sub = $concat(a, b).subscribe(createCollectObserver(values));

  a.next('a1');
  sub.unsubscribe();
  a.next('a2');
  a.complete();
  b.next('b1');
  b.complete();

  expect(values).toEqual(['a1']);
});

test('closes all subscriptions when unsubscribed', async () => {
  const foo$ = new Subject();
  const bar$ = new Subject();

  const subscriptions = trackSubscriptions(foo$, bar$);

  const sub = $concat(foo$, bar$).subscribe();
  sub.unsubscribe();

  // We only expect `foo$` to have been subscribed at this point
  const expectedNumberOfSubscriptions = 1;

  await subscriptions.ensureSubscriptionsAreClosed(
    expectedNumberOfSubscriptions
  );
});

test('closes all subscriptions when all observables complete', async () => {
  const foo$ = new Subject();
  const bar$ = new Subject();

  const subscriptions = trackSubscriptions(foo$, bar$);

  $concat(foo$, bar$).subscribe();

  foo$.complete();
  bar$.complete();

  await subscriptions.ensureSubscriptionsAreClosed();
});
