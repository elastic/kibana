/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { nodeBuilder } from './node_builder';
import { toElasticsearchQuery } from '..';
import { buildNode } from './literal';

jest.mock('../grammar');

describe('nodeBuilder', () => {
  describe('is method', () => {
    test('string value', () => {
      const nodes = nodeBuilder.is('foo', 'bar');
      const query = toElasticsearchQuery(nodes);
      expect(query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "match": Object {
                  "foo": "bar",
                },
              },
            ],
          },
        }
      `);
    });

    test('KueryNode value', () => {
      const literalValue = buildNode('bar');
      const nodes = nodeBuilder.is('foo', literalValue);
      const query = toElasticsearchQuery(nodes);
      expect(query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "match": Object {
                  "foo": "bar",
                },
              },
            ],
          },
        }
      `);
    });
  });

  describe('and method', () => {
    test('no clauses', () => {
      const node = nodeBuilder.and([]);
      const query = toElasticsearchQuery(node);
      expect(node).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [],
          "function": "and",
          "type": "function",
        }
      `);
      expect(query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [],
          },
        }
      `);
    });

    test('single clause', () => {
      const nodes = [nodeBuilder.is('foo', 'bar')];
      const query = toElasticsearchQuery(nodeBuilder.and(nodes));
      expect(query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "match": Object {
                  "foo": "bar",
                },
              },
            ],
          },
        }
      `);
    });

    test('two clauses', () => {
      const nodes = [nodeBuilder.is('foo1', 'bar1'), nodeBuilder.is('foo2', 'bar2')];
      const query = toElasticsearchQuery(nodeBuilder.and(nodes));
      expect(query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "foo1": "bar1",
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "foo2": "bar2",
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });

    test('three clauses', () => {
      const nodes = [
        nodeBuilder.is('foo1', 'bar1'),
        nodeBuilder.is('foo2', 'bar2'),
        nodeBuilder.is('foo3', 'bar3'),
      ];
      const query = toElasticsearchQuery(nodeBuilder.and(nodes));
      expect(query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "foo1": "bar1",
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "foo2": "bar2",
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "foo3": "bar3",
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });
  });

  describe('or method', () => {
    test('no clauses', () => {
      const node = nodeBuilder.or([]);
      const query = toElasticsearchQuery(node);
      expect(node).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [],
          "function": "or",
          "type": "function",
        }
      `);
      expect(query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [],
          },
        }
      `);
    });

    test('single clause', () => {
      const nodes = [nodeBuilder.is('foo', 'bar')];
      const query = toElasticsearchQuery(nodeBuilder.or(nodes));
      expect(query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "match": Object {
                  "foo": "bar",
                },
              },
            ],
          },
        }
      `);
    });

    test('two clauses', () => {
      const nodes = [nodeBuilder.is('foo1', 'bar1'), nodeBuilder.is('foo2', 'bar2')];
      const query = toElasticsearchQuery(nodeBuilder.or(nodes));
      expect(query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "foo1": "bar1",
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "foo2": "bar2",
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });

    test('three clauses', () => {
      const nodes = [
        nodeBuilder.is('foo1', 'bar1'),
        nodeBuilder.is('foo2', 'bar2'),
        nodeBuilder.is('foo3', 'bar3'),
      ];
      const query = toElasticsearchQuery(nodeBuilder.or(nodes));
      expect(query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "foo1": "bar1",
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "foo2": "bar2",
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "foo3": "bar3",
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });
  });

  describe('range method', () => {
    const date = new Date(1679741259769);
    const dateString = date.toISOString();

    test('formats all range operators', () => {
      const operators: Array<'gt' | 'gte' | 'lt' | 'lte'> = ['gt', 'gte', 'lt', 'lte'];

      for (const operator of operators) {
        const nodes = nodeBuilder.range('foo', operator, dateString);
        const query = toElasticsearchQuery(nodes);

        expect(query).toMatchObject({
          bool: {
            minimum_should_match: 1,
            should: [
              {
                range: {
                  foo: {
                    [operator]: dateString,
                  },
                },
              },
            ],
          },
        });
      }
    });
  });
});
