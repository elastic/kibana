/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { nodeBuilder } from './node_builder';
import { toElasticsearchQuery } from '..';

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
      const literalValue = {
        type: 'literal' as 'literal',
        value: 'bar',
      };
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
});
