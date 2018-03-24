import { switchMap } from './switch_map';
import { Observable } from '../observable';
import { collect } from '../lib/collect';
import { $of } from '../factories';
import { Subject } from '../subjects';

const number$ = $of(1, 2, 3);

test('returns the modified value', async () => {
  const expected = ['a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3', 'c3', 'C'];

  const observable = number$.pipe(
    switchMap(x => $of('a' + x, 'b' + x, 'c' + x))
  );
  const res = collect(observable);

  expect(await res).toEqual(expected);
});

test('injects index to map', async () => {
  const observable = number$.pipe(switchMap((x, i) => $of(i)));
  const res = collect(observable);

  expect(await res).toEqual([0, 1, 2, 'C']);
});

test('should unsubscribe inner observable when source observable emits new value', async () => {
  const unsubbed: string[] = [];
  const subject = new Subject<string>();

  subject
    .pipe(
      switchMap(
        x =>
          new Observable(() => {
            return () => {
              unsubbed.push(x);
            };
          })
      )
    )
    .subscribe();

  subject.next('a');
  expect(unsubbed).toEqual([]);

  subject.next('b');
  expect(unsubbed).toEqual(['a']);

  subject.next('c');
  expect(unsubbed).toEqual(['a', 'b']);

  subject.complete();
  expect(unsubbed).toEqual(['a', 'b', 'c']);
});

test('should unsubscribe inner observable when source observable errors', async () => {
  const unsubbed: string[] = [];
  const subject = new Subject<string>();

  subject
    .pipe(
      switchMap(
        x =>
          new Observable(() => {
            return () => {
              unsubbed.push(x);
            };
          })
      )
    )
    .subscribe();

  subject.next('a');
  subject.error(new Error('fail'));

  expect(unsubbed).toEqual(['a']);
});

test('should unsubscribe inner observables if inner observer completes', async () => {
  const unsubbed: string[] = [];
  const subject = new Subject<string>();

  subject
    .pipe(
      switchMap(
        x =>
          new Observable(observer => {
            observer.complete();
            return () => {
              unsubbed.push(x);
            };
          })
      )
    )
    .subscribe();

  subject.next('a');
  expect(unsubbed).toEqual(['a']);

  subject.next('b');
  expect(unsubbed).toEqual(['a', 'b']);

  subject.complete();
  expect(unsubbed).toEqual(['a', 'b']);
});

test('should unsubscribe inner observables if inner observer errors', async () => {
  const unsubbed: string[] = [];
  const subject = new Subject<string>();

  const error = jest.fn();
  const thrownError = new Error('fail');

  subject
    .pipe(
      switchMap(
        x =>
          new Observable(observer => {
            observer.error(thrownError);
            return () => {
              unsubbed.push(x);
            };
          })
      )
    )
    .subscribe({
      error,
    });

  subject.next('a');
  expect(unsubbed).toEqual(['a']);

  expect(error).toHaveBeenCalledTimes(1);
  expect(error).toHaveBeenCalledWith(thrownError);
});

test('should switch inner observables', () => {
  const outer$ = new Subject<'x' | 'y'>();
  const inner$ = {
    x: new Subject(),
    y: new Subject(),
  };

  const actual: any[] = [];

  outer$.pipe(switchMap(x => inner$[x])).subscribe({
    next(val) {
      actual.push(val);
    },
  });

  outer$.next('x');
  inner$.x.next('foo');
  inner$.x.next('bar');

  outer$.next('y');
  inner$.x.next('baz');
  inner$.y.next('quux');

  outer$.complete();

  expect(actual).toEqual(['foo', 'bar', 'quux']);
});

test('should switch inner empty and empty', () => {
  const outer$ = new Subject<'x' | 'y'>();
  const inner$ = {
    x: new Subject(),
    y: new Subject(),
  };

  const next = jest.fn();

  outer$.pipe(switchMap(x => inner$[x])).subscribe(next);

  outer$.next('x');
  inner$.x.complete();

  outer$.next('y');
  inner$.y.complete();

  outer$.complete();

  expect(next).not.toHaveBeenCalled();
});

test('should switch inner never and throw', async () => {
  const error = new Error('sad');

  const outer$ = new Subject<'x' | 'y'>();
  const inner$ = {
    x: new Subject(),
    y: new Subject(),
  };

  inner$.y.error(error);

  const observable = outer$.pipe(switchMap(x => inner$[x]));
  const res = collect(observable);

  outer$.next('x');
  outer$.next('y');
  outer$.complete();

  expect(await res).toEqual([error]);
});

test('should handle outer throw', async () => {
  const error = new Error('foo');
  const outer$ = new Observable<string>(() => {
    throw error;
  });

  const observable = outer$.pipe(switchMap(x => $of(x)));
  const res = collect(observable);

  expect(await res).toEqual([error]);
});

test('should handle outer error', async () => {
  const outer$ = new Subject<'x'>();
  const inner$ = {
    x: new Subject(),
  };

  const observable = outer$.pipe(switchMap(x => inner$[x]));
  const res = collect(observable);

  outer$.next('x');

  inner$.x.next('a');
  inner$.x.next('b');
  inner$.x.next('c');

  const error = new Error('foo');
  outer$.error(error);

  inner$.x.next('d');
  inner$.x.next('e');

  expect(await res).toEqual(['a', 'b', 'c', error]);
});

test('should raise error when projection throws', async () => {
  const outer$ = new Subject<string>();
  const error = new Error('foo');

  const observable = outer$.pipe(
    switchMap(x => {
      throw error;
    })
  );
  const res = collect(observable);

  outer$.next('x');

  expect(await res).toEqual([error]);
});

test('should switch inner cold observables, outer is unsubscribed early', () => {
  const outer$ = new Subject<'x' | 'y'>();
  const inner$ = {
    x: new Subject(),
    y: new Subject(),
  };

  const actual: any[] = [];
  const sub = outer$.pipe(switchMap(x => inner$[x])).subscribe({
    next(val) {
      actual.push(val);
    },
  });

  outer$.next('x');
  inner$.x.next('foo');
  inner$.x.next('bar');

  outer$.next('y');
  inner$.y.next('baz');
  inner$.y.next('quux');

  sub.unsubscribe();

  inner$.x.next('post x');
  inner$.x.complete();

  inner$.y.next('post y');
  inner$.y.complete();

  expect(actual).toEqual(['foo', 'bar', 'baz', 'quux']);
});
