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

expect.addSnapshotSerializer(
  createRecursiveSerializer(
    (v) => typeof v === 'object' && v && mockPrint in v,
    (v) => v[mockPrint]()
  )
);

jest.mock('elastic-apm-node', () => {
  return {
    startSpan: jest.fn(() => {
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
          return `SPAN[outcome=${outcome}, ended=${ended}]`;
        },
      };
    }),
  };
});

const apm = jest.requireMock('elastic-apm-node');

beforeEach(() => {
  jest.clearAllMocks();
});

it('deeply wraps objects so that methods start and end spans', () => {
  const instance = {
    foo() {
      return 'foo';
    },
    bar() {
      throw new Error('bar');
    },
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

  const instrumented = createApmInstrumentedInstance('myInstance', instance);

  expect(instrumented.foo()).toBe('foo');
  expect(instrumented.sub.api.subFoo()).toBe('subFoo');
  expect(() => instrumented.bar()).toThrowErrorMatchingInlineSnapshot(`"bar"`);
  expect(() => instrumented.sub.api.subBar()).toThrowErrorMatchingInlineSnapshot(`"subBar"`);

  expect(apm.startSpan).toMatchInlineSnapshot(`
    [MockFunction] {
      "calls": Array [
        Array [
          "myInstance.foo()",
        ],
        Array [
          "myInstance.sub.api.subFoo()",
        ],
        Array [
          "myInstance.bar()",
        ],
        Array [
          "myInstance.sub.api.subBar()",
        ],
      ],
      "results": Array [
        Object {
          "type": "return",
          "value": "SPAN[outcome=success, ended=true]",
        },
        Object {
          "type": "return",
          "value": "SPAN[outcome=success, ended=true]",
        },
        Object {
          "type": "return",
          "value": "SPAN[outcome=failure, ended=true]",
        },
        Object {
          "type": "return",
          "value": "SPAN[outcome=failure, ended=true]",
        },
      ],
    }
  `);
});
