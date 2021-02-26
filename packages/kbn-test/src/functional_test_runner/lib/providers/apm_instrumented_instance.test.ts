/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRecursiveSerializer } from '@kbn/dev-utils';

import { createApmInstrumentedInstance } from './apm_instrumented_instance';

const mockPrint = Symbol('print');

jest.mock('elastic-apm-node', () => ({
  isStarted: jest.fn(() => true),
  startSpan: jest.fn((...names: string[]) => {
    let outcome: string | null = null;
    let ended = false;
    return {
      setOutcome(_: string) {
        outcome = _;
      },
      end() {
        ended = true;
      },
      [mockPrint]() {
        return `SPAN[name=${names.join('/')}, outcome=${outcome}, ended=${ended}]`;
      },
    };
  }),
}));

const { startSpan } = jest.requireMock('elastic-apm-node');

afterEach(() => {
  jest.clearAllMocks();
});

expect.addSnapshotSerializer(
  createRecursiveSerializer(
    (v) => typeof v === 'object' && v && mockPrint in v,
    (v) => v[mockPrint]()
  )
);

it('deeply wraps objects so that methods start and end spans', () => {
  const hidden = Symbol();
  const instance = {
    foo() {
      return 'foo';
    },
    bar() {
      throw new Error('bar');
    },
    [hidden]() {
      return 'hidden';
    },
    items: [
      {
        foo: 1,
        inArray() {
          return 'inArray';
        },
      },
    ],
    sub: {
      api: {
        subFoo() {
          return 'subFoo';
        },
        subBar() {
          throw new Error('subBar');
        },
      },
    },
  };

  const instrumented = createApmInstrumentedInstance(instance, 'service', 'myInstance');

  expect(instrumented.foo()).toBe('foo');
  expect(instrumented.sub.api.subFoo()).toBe('subFoo');
  expect(instrumented[hidden]()).toBe('hidden');
  expect(instrumented.items[0].inArray()).toBe('inArray');
  expect(() => instrumented.bar()).toThrowErrorMatchingInlineSnapshot(`"bar"`);
  expect(() => instrumented.sub.api.subBar()).toThrowErrorMatchingInlineSnapshot(`"subBar"`);

  expect(startSpan).toMatchInlineSnapshot(`
    [MockFunction] {
      "calls": Array [
        Array [
          "myInstance.foo()",
          "service",
          "myInstance",
          "foo",
        ],
        Array [
          "myInstance.sub.api.subFoo()",
          "service",
          "myInstance",
          "sub.api.subFoo",
        ],
        Array [
          "myInstance.items.0.inArray()",
          "service",
          "myInstance",
          "items.0.inArray",
        ],
        Array [
          "myInstance.bar()",
          "service",
          "myInstance",
          "bar",
        ],
        Array [
          "myInstance.sub.api.subBar()",
          "service",
          "myInstance",
          "sub.api.subBar",
        ],
      ],
      "results": Array [
        Object {
          "type": "return",
          "value": "SPAN[name=myInstance.foo()/service/myInstance/foo, outcome=success, ended=true]",
        },
        Object {
          "type": "return",
          "value": "SPAN[name=myInstance.sub.api.subFoo()/service/myInstance/sub.api.subFoo, outcome=success, ended=true]",
        },
        Object {
          "type": "return",
          "value": "SPAN[name=myInstance.items.0.inArray()/service/myInstance/items.0.inArray, outcome=success, ended=true]",
        },
        Object {
          "type": "return",
          "value": "SPAN[name=myInstance.bar()/service/myInstance/bar, outcome=failure, ended=true]",
        },
        Object {
          "type": "return",
          "value": "SPAN[name=myInstance.sub.api.subBar()/service/myInstance/sub.api.subBar, outcome=failure, ended=true]",
        },
      ],
    }
  `);
});
