/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMockContext } from '../../../../expressions/common';
import { functionWrapper } from './utils';
import { removeFilterFunction } from './remove_filter';
import { KibanaContext } from './kibana_context_type';

describe('interpreter/functions#removeFilter', () => {
  const fn = functionWrapper(removeFilterFunction);
  const kibanaContext: KibanaContext = {
    type: 'kibana_context',
    filters: [
      {
        meta: {
          group: 'g1',
        },
        query: {},
      },
      {
        meta: {
          group: 'g2',
        },
        query: {},
      },
      {
        meta: {
          group: 'g1',
          controlledBy: 'i1',
        },
        query: {},
      },
      {
        meta: {
          group: 'g1',
          controlledBy: 'i2',
        },
        query: {},
      },
      {
        meta: {
          controlledBy: 'i1',
        },
        query: {},
      },
    ],
  };

  it('removes all filters when called without arguments', () => {
    const actual = fn(kibanaContext, {}, createMockContext());
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "filters": Array [],
        "type": "kibana_context",
      }
    `);
  });

  it('removes filters belonging to certain group', () => {
    const actual = fn(kibanaContext, { group: 'g1' }, createMockContext());
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "filters": Array [
          Object {
            "meta": Object {
              "group": "g2",
            },
            "query": Object {},
          },
          Object {
            "meta": Object {
              "controlledBy": "i1",
            },
            "query": Object {},
          },
        ],
        "type": "kibana_context",
      }
    `);
  });

  it('removes ungrouped filters', () => {
    const actual = fn(kibanaContext, { ungrouped: true }, createMockContext());
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "filters": Array [
          Object {
            "meta": Object {
              "group": "g1",
            },
            "query": Object {},
          },
          Object {
            "meta": Object {
              "group": "g2",
            },
            "query": Object {},
          },
          Object {
            "meta": Object {
              "controlledBy": "i1",
              "group": "g1",
            },
            "query": Object {},
          },
          Object {
            "meta": Object {
              "controlledBy": "i2",
              "group": "g1",
            },
            "query": Object {},
          },
        ],
        "type": "kibana_context",
      }
    `);
  });

  it('removes ungrouped filters and filters matching a group', () => {
    const actual = fn(kibanaContext, { group: 'g1', ungrouped: true }, createMockContext());
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "filters": Array [
          Object {
            "meta": Object {
              "group": "g2",
            },
            "query": Object {},
          },
        ],
        "type": "kibana_context",
      }
    `);
  });

  it('removes filters controlled by specified id', () => {
    const actual = fn(kibanaContext, { from: 'i1' }, createMockContext());
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "filters": Array [
          Object {
            "meta": Object {
              "group": "g1",
            },
            "query": Object {},
          },
          Object {
            "meta": Object {
              "group": "g2",
            },
            "query": Object {},
          },
          Object {
            "meta": Object {
              "controlledBy": "i2",
              "group": "g1",
            },
            "query": Object {},
          },
        ],
        "type": "kibana_context",
      }
    `);
  });

  it('removes filters controlled by specified id and matching a group', () => {
    const actual = fn(kibanaContext, { group: 'g1', from: 'i1' }, createMockContext());
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "filters": Array [
          Object {
            "meta": Object {
              "group": "g1",
            },
            "query": Object {},
          },
          Object {
            "meta": Object {
              "group": "g2",
            },
            "query": Object {},
          },
          Object {
            "meta": Object {
              "controlledBy": "i2",
              "group": "g1",
            },
            "query": Object {},
          },
          Object {
            "meta": Object {
              "controlledBy": "i1",
            },
            "query": Object {},
          },
        ],
        "type": "kibana_context",
      }
    `);
  });
});
