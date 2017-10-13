import { Observable } from '../Observable';
import { Subject } from '../Subject';
import { BehaviorSubject } from '../BehaviorSubject';

test('should extend Subject', () => {
  const subject = new BehaviorSubject(null);
  expect(subject).toBeInstanceOf(Subject);
});

test('should throw if it has received an error and getValue() is called', () => {
  const subject = new BehaviorSubject(null);

  subject.error(new Error('derp'));

  expect(() => {
    subject.getValue();
  }).toThrowErrorMatchingSnapshot();
});

test('should have a getValue() method to retrieve the current value', () => {
  const subject = new BehaviorSubject('foo');

  expect(subject.getValue()).toEqual('foo');

  subject.next('bar');

  expect(subject.getValue()).toEqual('bar');
});

test('should still allow you to retrieve the value from the value property', () => {
  const subject = new BehaviorSubject('fuzzy');
  expect(subject.getValue()).toEqual('fuzzy');
  subject.next('bunny');
  expect(subject.getValue()).toEqual('bunny');
});

test('should start with an initialization value', done => {
  const subject = new BehaviorSubject('foo');
  const expected = ['foo', 'bar'];
  let i = 0;

  subject.subscribe({
    next: x => {
      expect(x).toEqual(expected[i++]);
    },
    complete: done
  });

  subject.next('bar');
  subject.complete();
});

test('should pump values to multiple subscribers', done => {
  const subject = new BehaviorSubject('init');
  const expected = ['init', 'foo', 'bar'];
  let i = 0;
  let j = 0;

  subject.subscribe({
    next: x => {
      expect(x).toEqual(expected[i++]);
    }
  });

  subject.subscribe({
    next: x => {
      expect(x).toEqual(expected[j++]);
    },
    complete: done
  });

  expect((subject as any).observers.size).toEqual(2);
  subject.next('foo');
  subject.next('bar');
  subject.complete();
});

test('should not pass values nexted after a complete', () => {
  const subject = new BehaviorSubject('init');
  const results: any[] = [];

  subject.subscribe(x => {
    results.push(x);
  });
  expect(results).toEqual(['init']);

  subject.next('foo');
  expect(results).toEqual(['init', 'foo']);

  subject.complete();
  expect(results).toEqual(['init', 'foo']);

  subject.next('bar');
  expect(results).toEqual(['init', 'foo']);
});

test('should clean out unsubscribed subscribers', done => {
  const subject = new BehaviorSubject('init');

  const sub1 = subject.subscribe(x => {
    expect(x).toEqual('init');
  });

  const sub2 = subject.subscribe(x => {
    expect(x).toEqual('init');
  });

  expect((subject as any).observers.size).toEqual(2);
  sub1.unsubscribe();
  expect((subject as any).observers.size).toEqual(1);
  sub2.unsubscribe();
  expect((subject as any).observers.size).toEqual(0);
  done();
});

test('should replay the previous value when subscribed', () => {
  const subject = new BehaviorSubject(0);

  subject.next(1);
  subject.next(2);

  const s1Actual: number[] = [];
  const s1 = subject.subscribe(x => {
    s1Actual.push(x);
  });

  subject.next(3);
  subject.next(4);

  const s2Actual: number[] = [];
  const s2 = subject.subscribe(x => {
    s2Actual.push(x);
  });

  s1.unsubscribe();

  subject.next(5);

  const s3Actual: number[] = [];
  const s3 = subject.subscribe(x => {
    s3Actual.push(x);
  });

  s2.unsubscribe();
  s3.unsubscribe();

  subject.complete();

  expect(s1Actual).toEqual([2, 3, 4]);
  expect(s2Actual).toEqual([4, 5]);
  expect(s3Actual).toEqual([5]);
});

test('should emit complete when subscribed after completed', () => {
  const source = Observable.of(1, 2, 3, 4, 5);
  const subject = new BehaviorSubject(0);

  const next = jest.fn();
  const complete = jest.fn();

  subject.complete();

  subject.subscribe(next, undefined, complete);
  source.subscribe(subject);

  expect(next).not.toHaveBeenCalled();
  expect(complete).toHaveBeenCalledTimes(1);
});

test('should be an Observer which can be given to Observable.subscribe', done => {
  const source = Observable.of(1, 2, 3, 4, 5);
  const subject = new BehaviorSubject(0);

  const actual: number[] = [];

  subject.subscribe(
    x => {
      actual.push(x);
    },
    x => {
      done(new Error('should not be called'));
    },
    () => {
      done();
    }
  );

  source.subscribe(subject);

  expect(actual).toEqual([0, 1, 2, 3, 4, 5]);
});
