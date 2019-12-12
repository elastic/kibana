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

import { Lifecycle } from './lifecycle';
import { FailureMetadata } from './failure_metadata';

it('collects metadata for the current test', async () => {
  const lifecycle = new Lifecycle();
  const failureMetadata = new FailureMetadata(lifecycle);

  const test1 = {};
  await lifecycle.beforeEachTest.trigger(test1);
  failureMetadata.add({ foo: 'bar' });

  expect(failureMetadata.get(test1)).toMatchInlineSnapshot(`
    Object {
      "foo": "bar",
    }
  `);

  const test2 = {};
  await lifecycle.beforeEachTest.trigger(test2);
  failureMetadata.add({ test: 2 });

  expect(failureMetadata.get(test1)).toMatchInlineSnapshot(`
    Object {
      "foo": "bar",
    }
  `);
  expect(failureMetadata.get(test2)).toMatchInlineSnapshot(`
    Object {
      "test": 2,
    }
  `);
});

it('adds messages to the messages state', () => {
  const lifecycle = new Lifecycle();
  const failureMetadata = new FailureMetadata(lifecycle);

  const test1 = {};
  lifecycle.beforeEachTest.trigger(test1);
  failureMetadata.addMessages(['foo', 'bar']);
  failureMetadata.addMessages(['baz']);

  expect(failureMetadata.get(test1)).toMatchInlineSnapshot(`
    Object {
      "messages": Array [
        "foo",
        "bar",
        "baz",
      ],
    }
  `);
});
