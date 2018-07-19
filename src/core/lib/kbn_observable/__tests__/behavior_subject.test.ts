/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { BehaviorSubject } from '../behavior_subject';
import { collect } from '../lib/collect';
import { Observable } from '../observable';
import { Subject } from '../subject';

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

test('should not update value after completed', () => {
  const subject = new BehaviorSubject('foo');

  expect(subject.getValue()).toEqual('foo');

  subject.next('bar');
  subject.complete();
  subject.next('quux');

  expect(subject.getValue()).toEqual('bar');
});

test('should start with an initialization value', async () => {
  const subject = new BehaviorSubject('foo');
  const res = collect(subject);

  subject.next('bar');
  subject.complete();

  expect(await res).toEqual(['foo', 'bar', 'C']);
});

test('should pump values to multiple subscribers', async () => {
  const subject = new BehaviorSubject('init');
  const expected = ['init', 'foo', 'bar', 'C'];

  const res1 = collect(subject);
  const res2 = collect(subject);

  expect((subject as any).observers.size).toEqual(2);
  subject.next('foo');
  subject.next('bar');
  subject.complete();

  expect(await res1).toEqual(expected);
  expect(await res2).toEqual(expected);
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

test('should clean out unsubscribed subscribers', () => {
  const subject = new BehaviorSubject('init');

  const sub1 = subject.subscribe();
  const sub2 = subject.subscribe();

  expect((subject as any).observers.size).toEqual(2);

  sub1.unsubscribe();
  expect((subject as any).observers.size).toEqual(1);

  sub2.unsubscribe();
  expect((subject as any).observers.size).toEqual(0);
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

test('should be an Observer which can be given to Observable.subscribe', async () => {
  const source = Observable.of(1, 2, 3, 4, 5);
  const subject = new BehaviorSubject(0);

  const res = collect(subject);

  source.subscribe(subject);

  expect(await res).toEqual([0, 1, 2, 3, 4, 5, 'C']);
  expect(subject.getValue()).toBe(5);
});
