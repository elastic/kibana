/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fields } from '../filters/stubs';
import { DataViewBase } from './types';
import { fromCombinedFilter } from './from_combined_filter';
import {
  BooleanRelation,
  buildCombinedFilter,
  buildExistsFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildRangeFilter,
} from '../filters';

describe('#fromCombinedFilter', function () {
  const indexPattern: DataViewBase = {
    id: 'logstash-*',
    fields,
    title: 'dataView',
  };

  const getField = (fieldName: string) => {
    const field = fields.find(({ name }) => fieldName === name);
    if (!field) throw new Error(`field ${name} does not exist`);
    return field;
  };

  describe('AND relation', () => {
    it('Generates an empty bool should clause with no filters', () => {
      const filter = buildCombinedFilter(BooleanRelation.AND, [], indexPattern);
      const result = fromCombinedFilter(filter);
      expect(result.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
    });

    it('Generates a bool should clause with its sub-filters', () => {
      const filters = [
        buildPhraseFilter(getField('extension'), 'value', indexPattern),
        buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
        buildExistsFilter(getField('machine.os'), indexPattern),
      ];
      const filter = buildCombinedFilter(BooleanRelation.AND, filters, indexPattern);
      const result = fromCombinedFilter(filter);
      expect(result.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "match_phrase": Object {
                  "extension": "value",
                },
              },
              Object {
                "range": Object {
                  "bytes": Object {
                    "gte": 10,
                  },
                },
              },
              Object {
                "exists": Object {
                  "field": "machine.os",
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
    });

    it('Handles negated sub-filters', () => {
      const negatedFilter = buildPhrasesFilter(getField('extension'), ['tar', 'gz'], indexPattern);
      negatedFilter.meta.negate = true;
      const filters = [
        negatedFilter,
        buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
        buildExistsFilter(getField('machine.os'), indexPattern),
      ];
      const filter = buildCombinedFilter(BooleanRelation.AND, filters, indexPattern);
      const result = fromCombinedFilter(filter);
      expect(result.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "bytes": Object {
                    "gte": 10,
                  },
                },
              },
              Object {
                "exists": Object {
                  "field": "machine.os",
                },
              },
            ],
            "must": Array [],
            "must_not": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match_phrase": Object {
                        "extension": "tar",
                      },
                    },
                    Object {
                      "match_phrase": Object {
                        "extension": "gz",
                      },
                    },
                  ],
                },
              },
            ],
            "should": Array [],
          },
        }
      `);
    });

    it('Preserves filter properties', () => {
      const filters = [
        buildPhraseFilter(getField('extension'), 'value', indexPattern),
        buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
        buildExistsFilter(getField('machine.os'), indexPattern),
      ];
      const filter = buildCombinedFilter(BooleanRelation.AND, filters, indexPattern);
      const { query, ...rest } = fromCombinedFilter(filter);
      expect(rest).toMatchInlineSnapshot(`
        Object {
          "$state": Object {
            "store": "appState",
          },
          "meta": Object {
            "alias": undefined,
            "disabled": false,
            "index": "logstash-*",
            "negate": false,
            "params": Array [
              Object {
                "meta": Object {
                  "index": "logstash-*",
                },
                "query": Object {
                  "match_phrase": Object {
                    "extension": "value",
                  },
                },
              },
              Object {
                "meta": Object {
                  "field": "bytes",
                  "index": "logstash-*",
                  "params": Object {},
                },
                "query": Object {
                  "range": Object {
                    "bytes": Object {
                      "gte": 10,
                    },
                  },
                },
              },
              Object {
                "meta": Object {
                  "index": "logstash-*",
                },
                "query": Object {
                  "exists": Object {
                    "field": "machine.os",
                  },
                },
              },
            ],
            "relation": "AND",
            "type": "combined",
          },
        }
      `);
    });
  });

  describe('OR relation', () => {
    it('Generates an empty bool should clause with no filters', () => {
      const filter = buildCombinedFilter(BooleanRelation.OR, [], indexPattern);
      const result = fromCombinedFilter(filter);
      expect(result.query).toMatchInlineSnapshot(`
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [],
                },
              }
          `);
    });

    it('Generates a bool should clause with its sub-filters', () => {
      const filters = [
        buildPhraseFilter(getField('extension'), 'value', indexPattern),
        buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
        buildExistsFilter(getField('machine.os'), indexPattern),
      ];
      const filter = buildCombinedFilter(BooleanRelation.OR, filters, indexPattern);
      const result = fromCombinedFilter(filter);
      expect(result.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "bool": Object {
                  "filter": Array [
                    Object {
                      "match_phrase": Object {
                        "extension": "value",
                      },
                    },
                  ],
                  "must": Array [],
                  "must_not": Array [],
                  "should": Array [],
                },
              },
              Object {
                "bool": Object {
                  "filter": Array [
                    Object {
                      "range": Object {
                        "bytes": Object {
                          "gte": 10,
                        },
                      },
                    },
                  ],
                  "must": Array [],
                  "must_not": Array [],
                  "should": Array [],
                },
              },
              Object {
                "bool": Object {
                  "filter": Array [
                    Object {
                      "exists": Object {
                        "field": "machine.os",
                      },
                    },
                  ],
                  "must": Array [],
                  "must_not": Array [],
                  "should": Array [],
                },
              },
            ],
          },
        }
      `);
    });

    it('Handles negated sub-filters', () => {
      const negatedFilter = buildPhrasesFilter(getField('extension'), ['tar', 'gz'], indexPattern);
      negatedFilter.meta.negate = true;
      const filters = [
        negatedFilter,
        buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
        buildExistsFilter(getField('machine.os'), indexPattern),
      ];
      const filter = buildCombinedFilter(BooleanRelation.OR, filters, indexPattern);
      const result = fromCombinedFilter(filter);
      expect(result.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "bool": Object {
                  "filter": Array [],
                  "must": Array [],
                  "must_not": Array [
                    Object {
                      "bool": Object {
                        "minimum_should_match": 1,
                        "should": Array [
                          Object {
                            "match_phrase": Object {
                              "extension": "tar",
                            },
                          },
                          Object {
                            "match_phrase": Object {
                              "extension": "gz",
                            },
                          },
                        ],
                      },
                    },
                  ],
                  "should": Array [],
                },
              },
              Object {
                "bool": Object {
                  "filter": Array [
                    Object {
                      "range": Object {
                        "bytes": Object {
                          "gte": 10,
                        },
                      },
                    },
                  ],
                  "must": Array [],
                  "must_not": Array [],
                  "should": Array [],
                },
              },
              Object {
                "bool": Object {
                  "filter": Array [
                    Object {
                      "exists": Object {
                        "field": "machine.os",
                      },
                    },
                  ],
                  "must": Array [],
                  "must_not": Array [],
                  "should": Array [],
                },
              },
            ],
          },
        }
      `);
    });

    it('Preserves filter properties', () => {
      const filters = [
        buildPhraseFilter(getField('extension'), 'value', indexPattern),
        buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
        buildExistsFilter(getField('machine.os'), indexPattern),
      ];
      const filter = buildCombinedFilter(BooleanRelation.OR, filters, indexPattern);
      const { query, ...rest } = fromCombinedFilter(filter);
      expect(rest).toMatchInlineSnapshot(`
        Object {
          "$state": Object {
            "store": "appState",
          },
          "meta": Object {
            "alias": undefined,
            "disabled": false,
            "index": "logstash-*",
            "negate": false,
            "params": Array [
              Object {
                "meta": Object {
                  "index": "logstash-*",
                },
                "query": Object {
                  "match_phrase": Object {
                    "extension": "value",
                  },
                },
              },
              Object {
                "meta": Object {
                  "field": "bytes",
                  "index": "logstash-*",
                  "params": Object {},
                },
                "query": Object {
                  "range": Object {
                    "bytes": Object {
                      "gte": 10,
                    },
                  },
                },
              },
              Object {
                "meta": Object {
                  "index": "logstash-*",
                },
                "query": Object {
                  "exists": Object {
                    "field": "machine.os",
                  },
                },
              },
            ],
            "relation": "OR",
            "type": "combined",
          },
        }
      `);
    });
  });

  describe('Nested relations', () => {
    it('Handles complex-nested filters with ANDs and ORs', () => {
      const filters = [
        buildCombinedFilter(
          BooleanRelation.OR,
          [
            buildPhrasesFilter(getField('extension'), ['tar', 'gz'], indexPattern),
            buildPhraseFilter(getField('ssl'), false, indexPattern),
            buildCombinedFilter(
              BooleanRelation.AND,
              [
                buildPhraseFilter(getField('extension'), 'value', indexPattern),
                buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
              ],
              indexPattern
            ),
            buildExistsFilter(getField('machine.os'), indexPattern),
          ],
          indexPattern
        ),
        buildPhrasesFilter(getField('machine.os.keyword'), ['foo', 'bar'], indexPattern),
      ];
      const filter = buildCombinedFilter(BooleanRelation.AND, filters, indexPattern);
      const result = fromCombinedFilter(filter);
      expect(result.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "bool": Object {
                        "filter": Array [
                          Object {
                            "bool": Object {
                              "minimum_should_match": 1,
                              "should": Array [
                                Object {
                                  "match_phrase": Object {
                                    "extension": "tar",
                                  },
                                },
                                Object {
                                  "match_phrase": Object {
                                    "extension": "gz",
                                  },
                                },
                              ],
                            },
                          },
                        ],
                        "must": Array [],
                        "must_not": Array [],
                        "should": Array [],
                      },
                    },
                    Object {
                      "bool": Object {
                        "filter": Array [
                          Object {
                            "match_phrase": Object {
                              "ssl": false,
                            },
                          },
                        ],
                        "must": Array [],
                        "must_not": Array [],
                        "should": Array [],
                      },
                    },
                    Object {
                      "bool": Object {
                        "filter": Array [
                          Object {
                            "bool": Object {
                              "filter": Array [
                                Object {
                                  "match_phrase": Object {
                                    "extension": "value",
                                  },
                                },
                                Object {
                                  "range": Object {
                                    "bytes": Object {
                                      "gte": 10,
                                    },
                                  },
                                },
                              ],
                              "must": Array [],
                              "must_not": Array [],
                              "should": Array [],
                            },
                          },
                        ],
                        "must": Array [],
                        "must_not": Array [],
                        "should": Array [],
                      },
                    },
                    Object {
                      "bool": Object {
                        "filter": Array [
                          Object {
                            "exists": Object {
                              "field": "machine.os",
                            },
                          },
                        ],
                        "must": Array [],
                        "must_not": Array [],
                        "should": Array [],
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
                      "match_phrase": Object {
                        "machine.os.keyword": "foo",
                      },
                    },
                    Object {
                      "match_phrase": Object {
                        "machine.os.keyword": "bar",
                      },
                    },
                  ],
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
    });
  });
});
