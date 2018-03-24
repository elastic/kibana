import { Observable } from '../observable';
import { $race } from './race';
import { $of } from './of';
import { collect } from '../lib/collect';
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

test('should race cold and cold', done => {
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

  setTimeout(() => {
    expect(values).toEqual(['foo', 'C']);
    done();
  }, 100);

  jest.advanceTimersByTime(100);
});

test('should race hot and hot', done => {
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

  setTimeout(() => {
    expect(values).toEqual(['bar', 'C']);
    done();
  }, 100);

  jest.advanceTimersByTime(100);
});

test('should race hot and cold', done => {
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

  setTimeout(() => {
    expect(values).toEqual(['bar', 'C']);
    done();
  }, 100);

  jest.advanceTimersByTime(100);
});

test('should race 2nd and 1st', done => {
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

  setTimeout(() => {
    expect(values).toEqual(['bar', 'C']);
    done();
  }, 100);

  jest.advanceTimersByTime(100);
});

test('should race emit and complete', done => {
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

  setTimeout(() => {
    expect(values).toEqual(['C']);
    done();
  }, 100);

  jest.advanceTimersByTime(100);
});

test('should allow unsubscribing early and explicitly', done => {
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

  setTimeout(() => {
    expect(values).toEqual([]);
    done();
  }, 100);

  jest.advanceTimersByTime(100);
});

test('should not break unsubscription chains when unsubscribed explicitly', done => {
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

  setTimeout(() => {
    expect(values).toEqual(['foo']);
    done();
  }, 100);

  jest.advanceTimersByTime(100);
});

test('should throw when error occurs mid stream', done => {
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

  setTimeout(() => {
    expect(values).toEqual(['bar', error]);
    done();
  }, 100);

  jest.advanceTimersByTime(100);
});

test('should throw when error occurs before a winner is found', done => {
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

  setTimeout(() => {
    expect(values).toEqual([error]);
    done();
  }, 100);

  jest.advanceTimersByTime(100);
});
