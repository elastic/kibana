/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { alertsFiltersToEsQuery, isEmptyExpression, isFilter } from './filters';

describe('isFilter', () => {
  it('should return true for items with filter property', () => {
    expect(isFilter({ filter: {} })).toBeTruthy();
  });

  it.each([null, undefined])('should return false for %s items', (filter) => {
    // @ts-expect-error: Testing empty values
    expect(isFilter(filter)).toBeFalsy();
  });
});

describe('isEmptyExpression', () => {
  it('should return true for empty expressions', () => {
    expect(isEmptyExpression([])).toBeTruthy();
  });

  it('should return true for filters without type', () => {
    expect(isEmptyExpression([{ filter: {} }])).toBeTruthy();
  });

  it('should return true for filters without value', () => {
    expect(isEmptyExpression([{ filter: { type: 'ruleTags' } }])).toBeTruthy();
  });
});

describe('alertsFiltersToEsQuery', () => {
  it('should handle empty expressions', () => {
    expect(alertsFiltersToEsQuery([])).toMatchInlineSnapshot(`
      Object {
        "match_all": Object {},
      }
    `);
  });

  it('should handle and expressions', () => {
    expect(
      alertsFiltersToEsQuery([
        { filter: { type: 'ruleTags', value: ['tag1'] } },
        { operator: 'and' },
        { filter: { type: 'ruleTypes', value: ['type1'] } },
      ])
    ).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "match": Object {
                      "kibana.alert.rule.tags": "tag1",
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
                      "kibana.alert.rule.rule_type_id": "type1",
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

  it('should handle or expressions', () => {
    expect(
      alertsFiltersToEsQuery([
        { filter: { type: 'ruleTags', value: ['tag1'] } },
        { operator: 'or' },
        { filter: { type: 'ruleTypes', value: ['type1'] } },
      ])
    ).toMatchInlineSnapshot(`
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
                      "kibana.alert.rule.tags": "tag1",
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
                      "kibana.alert.rule.rule_type_id": "type1",
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

  it('should handle complex expressions', () => {
    expect(
      alertsFiltersToEsQuery([
        { filter: { type: 'ruleTags', value: ['tag1', 'tag2'] } },
        { operator: 'or' },
        { filter: { type: 'ruleTypes', value: ['type1'] } },
        { operator: 'and' },
        { filter: { type: 'ruleTags', value: ['tag3'] } },
        { operator: 'or' },
        { filter: { type: 'ruleTypes', value: ['type2', 'type3'] } },
      ])
    ).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "minimum_should_match": 1,
          "should": Array [
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
                            "kibana.alert.rule.tags": "tag1",
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
                            "kibana.alert.rule.tags": "tag2",
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "kibana.alert.rule.rule_type_id": "type1",
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
                            "kibana.alert.rule.tags": "tag3",
                          },
                        },
                      ],
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
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "kibana.alert.rule.rule_type_id": "type2",
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
                            "kibana.alert.rule.rule_type_id": "type3",
                          },
                        },
                      ],
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
