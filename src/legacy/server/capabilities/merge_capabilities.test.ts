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

import { mergeCapabilities } from './merge_capabilities';

const defaultProps = {
  catalogue: {},
  management: {},
  navLinks: {},
};

test(`"{ foo: {} }" doesn't clobber "{ foo: { bar: true } }"`, () => {
  const output1 = mergeCapabilities({ foo: { bar: true } }, { foo: {} });
  expect(output1).toEqual({ ...defaultProps, foo: { bar: true } });

  const output2 = mergeCapabilities({ foo: { bar: true } }, { foo: {} });
  expect(output2).toEqual({ ...defaultProps, foo: { bar: true } });
});

test(`"{ foo: { bar: true } }" doesn't clobber "{ baz: { quz: true } }"`, () => {
  const output1 = mergeCapabilities({ foo: { bar: true } }, { baz: { quz: true } });
  expect(output1).toEqual({ ...defaultProps, foo: { bar: true }, baz: { quz: true } });

  const output2 = mergeCapabilities({ baz: { quz: true } }, { foo: { bar: true } });
  expect(output2).toEqual({ ...defaultProps, foo: { bar: true }, baz: { quz: true } });
});

test(`"{ foo: { bar: { baz: true } } }" doesn't clobber "{ foo: { bar: { quz: true } } }"`, () => {
  const output1 = mergeCapabilities(
    { foo: { bar: { baz: true } } },
    { foo: { bar: { quz: true } } }
  );
  expect(output1).toEqual({ ...defaultProps, foo: { bar: { baz: true, quz: true } } });

  const output2 = mergeCapabilities(
    { foo: { bar: { quz: true } } },
    { foo: { bar: { baz: true } } }
  );
  expect(output2).toEqual({ ...defaultProps, foo: { bar: { baz: true, quz: true } } });
});

test(`error is thrown if boolean and object clash`, () => {
  expect(() => {
    mergeCapabilities({ foo: { bar: { baz: true } } }, { foo: { bar: true } });
  }).toThrowErrorMatchingInlineSnapshot(`"a boolean and an object can't be merged"`);

  expect(() => {
    mergeCapabilities({ foo: { bar: true } }, { foo: { bar: { baz: true } } });
  }).toThrowErrorMatchingInlineSnapshot(`"a boolean and an object can't be merged"`);
});

test(`supports duplicates as long as the booleans are the same`, () => {
  const output1 = mergeCapabilities({ foo: { bar: true } }, { foo: { bar: true } });
  expect(output1).toEqual({ ...defaultProps, foo: { bar: true } });

  const output2 = mergeCapabilities({ foo: { bar: false } }, { foo: { bar: false } });
  expect(output2).toEqual({ ...defaultProps, foo: { bar: false } });
});

test(`error is thrown if merging "true" and "false"`, () => {
  expect(() => {
    mergeCapabilities({ foo: { bar: false } }, { foo: { bar: true } });
  }).toThrowErrorMatchingInlineSnapshot(`"\\"true\\" and \\"false\\" can't be merged"`);

  expect(() => {
    mergeCapabilities({ foo: { bar: true } }, { foo: { bar: false } });
  }).toThrowErrorMatchingInlineSnapshot(`"\\"true\\" and \\"false\\" can't be merged"`);
});
