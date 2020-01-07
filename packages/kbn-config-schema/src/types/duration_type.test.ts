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

import { duration as momentDuration } from 'moment';
import { schema } from '..';

const { duration, object, contextRef, siblingRef } = schema;

test('returns value by default', () => {
  expect(duration().validate('123s')).toMatchSnapshot();
});

test('is required by default', () => {
  expect(() => duration().validate(undefined)).toThrowErrorMatchingSnapshot();
});

test('includes namespace in failure', () => {
  expect(() => duration().validate(undefined, {}, 'foo-namespace')).toThrowErrorMatchingSnapshot();
});

describe('#defaultValue', () => {
  test('can be a moment.Duration', () => {
    expect(
      duration({
        defaultValue: momentDuration(1, 'hour'),
      }).validate(undefined)
    ).toMatchSnapshot();
  });

  test('can be a string', () => {
    expect(
      duration({
        defaultValue: '1h',
      }).validate(undefined)
    ).toMatchSnapshot();
  });

  test('can be a string-formatted number', () => {
    expect(
      duration({
        defaultValue: '600',
      }).validate(undefined)
    ).toMatchSnapshot();
  });

  test('can be a number', () => {
    expect(
      duration({
        defaultValue: 600,
      }).validate(undefined)
    ).toMatchSnapshot();
  });

  test('can be a function that returns compatible type', () => {
    expect(
      duration({
        defaultValue: () => 600,
      }).validate(undefined)
    ).toMatchInlineSnapshot(`"PT0.6S"`);

    expect(
      duration({
        defaultValue: () => '1h',
      }).validate(undefined)
    ).toMatchInlineSnapshot(`"PT1H"`);

    expect(
      duration({
        defaultValue: () => momentDuration(1, 'hour'),
      }).validate(undefined)
    ).toMatchInlineSnapshot(`"PT1H"`);
  });

  test('can be a reference to a moment.Duration', () => {
    expect(
      object({
        source: duration({ defaultValue: 600 }),
        target: duration({ defaultValue: siblingRef('source') }),
        fromContext: duration({ defaultValue: contextRef('val') }),
      }).validate(undefined, { val: momentDuration(700, 'ms') })
    ).toMatchInlineSnapshot(`
Object {
  "fromContext": "PT0.7S",
  "source": "PT0.6S",
  "target": "PT0.6S",
}
`);

    expect(
      object({
        source: duration({ defaultValue: '1h' }),
        target: duration({ defaultValue: siblingRef('source') }),
        fromContext: duration({ defaultValue: contextRef('val') }),
      }).validate(undefined, { val: momentDuration(2, 'hour') })
    ).toMatchInlineSnapshot(`
Object {
  "fromContext": "PT2H",
  "source": "PT1H",
  "target": "PT1H",
}
`);

    expect(
      object({
        source: duration({ defaultValue: momentDuration(1, 'hour') }),
        target: duration({ defaultValue: siblingRef('source') }),
        fromContext: duration({ defaultValue: contextRef('val') }),
      }).validate(undefined, { val: momentDuration(2, 'hour') })
    ).toMatchInlineSnapshot(`
Object {
  "fromContext": "PT2H",
  "source": "PT1H",
  "target": "PT1H",
}
`);
  });
});

test('returns error when not string or non-safe positive integer', () => {
  expect(() => duration().validate(-123)).toThrowErrorMatchingSnapshot();

  expect(() => duration().validate(NaN)).toThrowErrorMatchingSnapshot();

  expect(() => duration().validate(Infinity)).toThrowErrorMatchingSnapshot();

  expect(() => duration().validate(Math.pow(2, 53))).toThrowErrorMatchingSnapshot();

  expect(() => duration().validate([1, 2, 3])).toThrowErrorMatchingSnapshot();

  expect(() => duration().validate(/abc/)).toThrowErrorMatchingSnapshot();
});
