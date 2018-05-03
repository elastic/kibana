import { Observable } from '../observable';
import { $race } from './race';
import { $of } from './of';
import { collect } from '../lib/collect';
import { trackSubscriptions } from '../lib/track_subscriptions';
import { Subject } from '../subjects';
import { mergeMap } from '../operators/merge_map';

beforeEach(() => {
  jest.useFakeTimers();
});

test('should race a single observable', async () => {
  const res = await collect($race($of(1, 2, 3)));
  expect(res).toEqual([1, 2, 3, 'C']);
});

test('completes immediately if given no observable', async () => {
  const res = await collect($race());
  expect(res).toEqual(['C']);
});

test('should race cold and cold', () => {
  const obs1 = new Observable<string>(observer => {
    setTimeout(() => {
      observer.next('foo');
      observer.complete();
    }, 30);
  });
  const obs2 = new Observable<string>(observer => {
    setTimeout(() => {
      observer.next('bar');
      observer.complete();
    }, 60);
  });

  const values: any[] = [];

  $race(obs1, obs2).subscribe({
    next(v) {
      values.push(v);
    },
    complete() {
      values.push('C');
    },
  });

  jest.advanceTimersByTime(100);

  expect(values).toEqual(['foo', 'C']);
});

test('should race hot and hot', () => {
  const obs1 = new Subject<string>();
  const obs2 = new Subject<string>();

  const values: any[] = [];

  $race(obs1, obs2).subscribe({
    next(v) {
      values.push(v);
    },
    complete() {
      values.push('C');
    },
  });

  setTimeout(() => {
    obs2.next('bar');
  }, 30);
  setTimeout(() => {
    obs1.next('foo');
  }, 50);
  setTimeout(() => {
    obs2.complete();
  }, 70);

  jest.advanceTimersByTime(100);

  expect(values).toEqual(['bar', 'C']);
});

test('should race hot and cold', () => {
  const obs1 = new Observable<string>(observer => {
    setTimeout(() => {
      observer.next('foo');
      observer.complete();
    }, 50);
  });
  const obs2 = new Subject<string>();

  const values: any[] = [];

  $race(obs1, obs2).subscribe({
    next(v) {
      values.push(v);
    },
    complete() {
      values.push('C');
    },
  });

  setTimeout(() => {
    obs2.next('bar');
  }, 30);
  setTimeout(() => {
    obs2.complete();
  }, 70);

  jest.advanceTimersByTime(100);

  expect(values).toEqual(['bar', 'C']);
});

test('should race 2nd and 1st', () => {
  const obs1 = new Observable<string>(observer => {
    setTimeout(() => {
      observer.next('foo');
      observer.complete();
    }, 60);
  });
  const obs2 = new Observable<string>(observer => {
    setTimeout(() => {
      observer.next('bar');
      observer.complete();
    }, 30);
  });

  const values: any[] = [];

  $race(obs1, obs2).subscribe({
    next(v) {
      values.push(v);
    },
    complete() {
      values.push('C');
    },
  });

  jest.advanceTimersByTime(100);

  expect(values).toEqual(['bar', 'C']);
});

test('should race emit and complete', () => {
  const obs1 = new Subject<string>();
  const obs2 = new Subject<string>();

  const values: any[] = [];

  $race(obs1, obs2).subscribe({
    next(v) {
      values.push(v);
    },
    complete() {
      values.push('C');
    },
  });

  setTimeout(() => {
    obs2.complete();
  }, 30);
  setTimeout(() => {
    obs1.next('foo');
  }, 50);

  jest.advanceTimersByTime(100);

  expect(values).toEqual(['C']);
});

test('should allow unsubscribing early and explicitly', () => {
  const obs1 = new Subject<string>();
  const obs2 = new Subject<string>();

  const values: any[] = [];

  const sub = $race(obs1, obs2).subscribe({
    next(v) {
      values.push(v);
    },
    complete() {
      values.push('C');
    },
  });

  sub.unsubscribe();

  setTimeout(() => {
    obs2.complete();
  }, 30);
  setTimeout(() => {
    obs1.next('foo');
  }, 50);

  jest.advanceTimersByTime(100);

  expect(values).toEqual([]);
});

test('should not break unsubscription chains when unsubscribed explicitly', () => {
  const obs1 = new Subject<string>();
  const obs2 = new Subject<string>();

  const values: any[] = [];

  const race = $race(
    obs1.pipe(mergeMap(x => $of(x))),
    obs2.pipe(mergeMap(x => $of(x)))
  );

  const sub = race.subscribe({
    next(v) {
      values.push(v);
    },
    complete() {
      values.push('C');
    },
  });

  setTimeout(() => {
    obs1.next('foo');
  }, 30);
  setTimeout(() => {
    sub.unsubscribe();
  }, 50);
  setTimeout(() => {
    obs1.next('bar');
  }, 70);

  jest.advanceTimersByTime(100);

  expect(values).toEqual(['foo']);
});

test('should throw when error occurs mid stream', () => {
  const obs1 = new Subject<string>();
  const obs2 = new Subject<string>();

  const values: any[] = [];

  const race = $race(obs1, obs2);

  race.subscribe({
    next(v) {
      values.push(v);
    },
    error(e) {
      values.push(e);
    },
    complete() {
      values.push('C');
    },
  });

  const error = new Error('foo');
  setTimeout(() => {
    obs1.next('bar');
  }, 30);
  setTimeout(() => {
    obs1.error(error);
  }, 70);

  jest.advanceTimersByTime(100);

  expect(values).toEqual(['bar', error]);
});

test('should throw when error occurs before a winner is found', () => {
  const obs1 = new Subject<string>();
  const obs2 = new Subject<string>();

  const values: any[] = [];

  const race = $race(obs1, obs2);

  race.subscribe({
    next(v) {
      values.push(v);
    },
    error(e) {
      values.push(e);
    },
    complete() {
      values.push('C');
    },
  });

  const error = new Error('foo');
  setTimeout(() => {
    obs1.error(error);
  }, 30);
  setTimeout(() => {
    obs1.next('bar');
  }, 70);

  jest.advanceTimersByTime(100);

  expect(values).toEqual([error]);
});

test('closes all subscriptions when unsubscribed', async () => {
  const obs1 = new Subject<string>();
  const obs2 = new Subject<string>();

  const subscriptions = trackSubscriptions(obs1, obs2);

  const sub = $race(obs1, obs2).subscribe();
  sub.unsubscribe();

  await subscriptions.ensureSubscriptionsAreClosed();
});

test('closes all subscriptions when any input observable completes', async () => {
  const obs1 = new Subject<string>();
  const obs2 = new Subject<string>();

  const subscriptions = trackSubscriptions(obs1, obs2);

  $race(obs1, obs2).subscribe();

  obs2.complete();

  await subscriptions.ensureSubscriptionsAreClosed();
});
