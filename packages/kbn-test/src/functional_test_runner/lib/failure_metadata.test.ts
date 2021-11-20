/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Lifecycle } from './lifecycle';
import { FailureMetadata } from './failure_metadata';
import { Test } from '../fake_mocha_types';

it('collects metadata for the current test', async () => {
  const lifecycle = new Lifecycle();
  const failureMetadata = new FailureMetadata(lifecycle);

  const test1 = {} as Test;
  await lifecycle.beforeEachRunnable.trigger(test1);
  failureMetadata.add({ foo: 'bar' });

  expect(failureMetadata.get(test1)).toMatchInlineSnapshot(`
    Object {
      "foo": "bar",
    }
  `);

  const test2 = {} as Test;
  await lifecycle.beforeEachRunnable.trigger(test2);
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

  const test1 = {} as Test;
  lifecycle.beforeEachRunnable.trigger(test1);
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
