import { Observable } from '../Observable';
import { Subject } from '../Subject';
import { k$ } from '../k$';
import { first } from '../operators';

const noop = () => {};

test('should pump values right on through itself', () => {
  const subject = new Subject<string>();
  const actual: string[] = [];

  subject.subscribe(x => {
    actual.push(x);
  });

  subject.next('foo');
  subject.next('bar');
  subject.complete();

  expect(actual).toEqual(['foo', 'bar']);
});

test('should pump values to multiple subscribers', () => {
  const subject = new Subject<string>();
  const actual: string[] = [];

  subject.subscribe(x => {
    actual.push(`1-${x}`);
  });

  subject.subscribe(x => {
    actual.push(`2-${x}`);
  });

  expect((subject as any).observers.size).toEqual(2);
  subject.next('foo');
  subject.next('bar');
  subject.complete();

  expect(actual).toEqual(['1-foo', '2-foo', '1-bar', '2-bar']);
});

test('should handle subscribers that arrive and leave at different times, subject does not complete', () => {
  const subject = new Subject();
  const results1: any[] = [];
  const results2: any[] = [];
  const results3: any[] = [];

  subject.next(1);
  subject.next(2);
  subject.next(3);
  subject.next(4);

  const subscription1 = subject.subscribe(
    x => {
      results1.push(x);
    },
    e => {
      results1.push('E');
    },
    () => {
      results1.push('C');
    }
  );

  subject.next(5);

  const subscription2 = subject.subscribe(
    x => {
      results2.push(x);
    },
    e => {
      results2.push('E');
    },
    () => {
      results2.push('C');
    }
  );

  subject.next(6);
  subject.next(7);

  subscription1.unsubscribe();

  subject.next(8);

  subscription2.unsubscribe();

  subject.next(9);
  subject.next(10);

  const subscription3 = subject.subscribe(
    x => {
      results3.push(x);
    },
    e => {
      results3.push('E');
    },
    () => {
      results3.push('C');
    }
  );

  subject.next(11);

  subscription3.unsubscribe();

  expect(results1).toEqual([5, 6, 7]);
  expect(results2).toEqual([6, 7, 8]);
  expect(results3).toEqual([11]);
});

test('should handle subscribers that arrive and leave at different times, subject completes', () => {
  const subject = new Subject();
  const results1: any[] = [];
  const results2: any[] = [];
  const results3: any[] = [];

  subject.next(1);
  subject.next(2);
  subject.next(3);
  subject.next(4);

  const subscription1 = subject.subscribe(
    x => {
      results1.push(x);
    },
    e => {
      results1.push('E');
    },
    () => {
      results1.push('C');
    }
  );

  subject.next(5);

  const subscription2 = subject.subscribe(
    x => {
      results2.push(x);
    },
    e => {
      results2.push('E');
    },
    () => {
      results2.push('C');
    }
  );

  subject.next(6);
  subject.next(7);

  subscription1.unsubscribe();

  subject.complete();

  subscription2.unsubscribe();

  const subscription3 = subject.subscribe(
    x => {
      results3.push(x);
    },
    e => {
      results3.push('E');
    },
    () => {
      results3.push('C');
    }
  );

  subscription3.unsubscribe();

  expect(results1).toEqual([5, 6, 7]);
  expect(results2).toEqual([6, 7, 'C']);
  expect(results3).toEqual(['C']);
});

test('should handle subscribers that arrive and leave at different times, subject terminates with an error', () => {
  const subject = new Subject();
  const results1: any[] = [];
  const results2: any[] = [];
  const results3: any[] = [];

  subject.next(1);
  subject.next(2);
  subject.next(3);
  subject.next(4);

  const subscription1 = subject.subscribe(
    x => {
      results1.push(x);
    },
    e => {
      results1.push('E');
    },
    () => {
      results1.push('C');
    }
  );

  subject.next(5);

  const subscription2 = subject.subscribe(
    x => {
      results2.push(x);
    },
    e => {
      results2.push('E');
    },
    () => {
      results2.push('C');
    }
  );

  subject.next(6);
  subject.next(7);

  subscription1.unsubscribe();

  subject.error(new Error('err'));

  subscription2.unsubscribe();

  const subscription3 = subject.subscribe(
    x => {
      results3.push(x);
    },
    e => {
      results3.push('E');
    },
    () => {
      results3.push('C');
    }
  );

  subscription3.unsubscribe();

  expect(results1).toEqual([5, 6, 7]);
  expect(results2).toEqual([6, 7, 'E']);
  expect(results3).toEqual(['E']);
});

test('should handle subscribers that arrive and leave at different times, subject completes before nexting any value', () => {
  const subject = new Subject();
  const results1: any[] = [];
  const results2: any[] = [];
  const results3: any[] = [];

  const subscription1 = subject.subscribe(
    x => {
      results1.push(x);
    },
    e => {
      results1.push('E');
    },
    () => {
      results1.push('C');
    }
  );

  const subscription2 = subject.subscribe(
    x => {
      results2.push(x);
    },
    e => {
      results2.push('E');
    },
    () => {
      results2.push('C');
    }
  );

  subscription1.unsubscribe();

  subject.complete();

  subscription2.unsubscribe();

  const subscription3 = subject.subscribe(
    x => {
      results3.push(x);
    },
    e => {
      results3.push('E');
    },
    () => {
      results3.push('C');
    }
  );

  subscription3.unsubscribe();

  expect(results1).toEqual([]);
  expect(results2).toEqual(['C']);
  expect(results3).toEqual(['C']);
});

test('should clean out unsubscribed subscribers', () => {
  const subject = new Subject();

  const sub1 = subject.subscribe(noop);
  const sub2 = subject.subscribe(noop);

  expect((subject as any).observers.size).toBe(2);

  sub1.unsubscribe();
  expect((subject as any).observers.size).toBe(1);

  sub2.unsubscribe();
  expect((subject as any).observers.size).toBe(0);
});

test('should be an Observer which can be given to Observable.subscribe', () => {
  const source = Observable.of(1, 2, 3, 4, 5);
  const subject = new Subject<number>();
  const actual: number[] = [];

  const err = jest.fn();
  const complete = jest.fn();

  subject.subscribe(
    x => {
      actual.push(x);
    },
    err,
    complete
  );

  source.subscribe(subject);

  expect(actual).toEqual([1, 2, 3, 4, 5]);
  expect(err).not.toHaveBeenCalled();
  expect(complete).toHaveBeenCalledTimes(1);
});

test('can use subject in $k', async () => {
  const values$ = new Subject();

  const next = jest.fn();
  const complete = jest.fn();
  const error = jest.fn();

  k$(values$)(first()).subscribe({
    next,
    error,
    complete
  });

  values$.next('test');

  expect(next).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenCalledWith('test');
  expect(error).not.toHaveBeenCalled();
  expect(complete).toHaveBeenCalled();
});

test('should not next after completed', () => {
  const subject = new Subject<string>();
  const results: any[] = [];

  subject.subscribe(x => results.push(x), undefined, () => results.push('C'));

  subject.next('a');
  subject.complete();
  subject.next('b');

  expect(results).toEqual(['a', 'C']);
});

test('should not next after error', () => {
  const error = new Error('wut?');
  const subject = new Subject();
  const results: any[] = [];

  subject.subscribe(x => results.push(x), err => results.push(err));

  subject.next('a');
  subject.error(error);
  subject.next('b');

  expect(results).toEqual(['a', error]);
});

describe('asObservable', () => {
  test('should hide subject', () => {
    const subject = new Subject();
    const observable = subject.asObservable();

    expect(subject).not.toBe(observable);

    expect(observable).toBeInstanceOf(Observable);
    expect(observable).not.toBeInstanceOf(Subject);
  });

  test('should handle subject completes without emits', () => {
    const subject = new Subject();

    let complete = jest.fn();

    subject.asObservable().subscribe({
      complete
    });

    subject.complete();

    expect(complete).toHaveBeenCalledTimes(1);
  });

  test('should handle subject throws', () => {
    const subject = new Subject();

    let error = jest.fn();

    subject.asObservable().subscribe({
      error
    });

    const e = new Error('yep');
    subject.error(e);

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(e);
  });

  test('should handle subject emits', () => {
    const subject = new Subject<number>();

    let actual: number[] = [];

    subject.asObservable().subscribe({
      next(x) {
        actual.push(x);
      }
    });

    subject.next(1);
    subject.next(2);
    subject.complete();

    expect(actual).toEqual([1, 2]);
  });

  test('can unsubscribe', () => {
    const subject = new Subject<number>();

    let actual: number[] = [];

    const sub = subject.asObservable().subscribe({
      next(x) {
        actual.push(x);
      }
    });

    subject.next(1);

    sub.unsubscribe();

    subject.next(2);
    subject.complete();

    expect(actual).toEqual([1]);
  });

  test('should handle multiple observables', () => {
    const subject = new Subject<string>();

    let actual: string[] = [];

    subject.asObservable().subscribe({
      next(x) {
        actual.push(`1-${x}`);
      }
    });

    subject.asObservable().subscribe({
      next(x) {
        actual.push(`2-${x}`);
      }
    });

    subject.next('foo');
    subject.next('bar');
    subject.complete();

    expect(actual).toEqual(['1-foo', '2-foo', '1-bar', '2-bar']);
  });
});
