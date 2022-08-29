/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import FilterBadge from './filter_badge';
import { getFilterMockOrConditional } from './__mock__/filters';

const mockedDataView = {
  id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
  title: 'logstash-*',
  fields: [
    {
      name: 'category.keyword',
      type: 'string',
      esTypes: ['integer'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
  getFormatterForField: () => ({
    convert: (name: string) => name,
  }),
} as unknown as DataView;

describe('filters_badge', () => {
  let filters: Filter[];
  const dataView: DataView = mockedDataView;
  const iconOnClick: () => void = jest.fn();
  const onClick: () => void = jest.fn();

  beforeAll(() => {
    filters = getFilterMockOrConditional();
  });

  describe('filters badge', () => {
    test('should return correct FilterMockOrConditional', () => {
      expect(FilterBadge({ filters, dataView, iconOnClick, onClick })).toMatchInlineSnapshot(`
        <EuiFlexGroup
          gutterSize="xs"
          responsive={false}
          wrap={true}
        >
          <EuiFlexItem
            grow={false}
          >
            <EuiBadge
              className="css-k0gr60"
              color="hollow"
              iconOnClick={[Function]}
              iconOnClickAriaLabel="Remove filter"
              iconSide="right"
              iconType="cross"
              onClick={[Function]}
              onClickAriaLabel="Filter actions"
              title=""
            >
              <EuiFlexGroup
                gutterSize="xs"
                responsive={false}
                wrap={true}
              >
                <FilterBadgeGroup
                  conditionType="AND"
                  dataView={
                    Object {
                      "fields": Array [
                        Object {
                          "aggregatable": true,
                          "esTypes": Array [
                            "integer",
                          ],
                          "filterable": true,
                          "name": "category.keyword",
                          "searchable": true,
                          "type": "string",
                        },
                      ],
                      "getFormatterForField": [Function],
                      "id": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
                      "title": "logstash-*",
                    }
                  }
                  filters={
                    Array [
                      Object {
                        "meta": Object {
                          "params": Array [
                            Object {
                              "$state": Object {
                                "store": "appState",
                              },
                              "meta": Object {
                                "alias": null,
                                "disabled": false,
                                "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
                                "key": "category.keyword",
                                "negate": true,
                                "params": Object {
                                  "query": "Men's Accessories 2",
                                },
                                "type": "phrase",
                                "value": [Function],
                              },
                              "query": Object {
                                "match_phrase": Object {
                                  "category.keyword": "Men's Accessories 2",
                                },
                              },
                            },
                            Array [
                              Object {
                                "$state": Object {
                                  "store": "appState",
                                },
                                "meta": Object {
                                  "alias": null,
                                  "disabled": false,
                                  "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
                                  "key": "category.keyword",
                                  "negate": false,
                                  "params": Object {
                                    "query": "Men's Accessories 3",
                                  },
                                  "type": "phrase",
                                  "value": [Function],
                                },
                                "query": Object {
                                  "match_phrase": Object {
                                    "category.keyword": "Men's Accessories 3",
                                  },
                                },
                              },
                              Object {
                                "$state": Object {
                                  "store": "appState",
                                },
                                "meta": Object {
                                  "alias": null,
                                  "disabled": false,
                                  "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
                                  "key": "category.keyword",
                                  "negate": false,
                                  "params": Object {
                                    "query": "Men's Accessories 4",
                                  },
                                  "type": "phrase",
                                  "value": [Function],
                                },
                                "query": Object {
                                  "match_phrase": Object {
                                    "category.keyword": "Men's Accessories 4",
                                  },
                                },
                              },
                            ],
                            Object {
                              "$state": Object {
                                "store": "appState",
                              },
                              "meta": Object {
                                "alias": null,
                                "disabled": false,
                                "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
                                "key": "category.keyword",
                                "negate": false,
                                "params": Object {
                                  "query": "Men's Accessories 5",
                                },
                                "type": "phrase",
                                "value": [Function],
                              },
                              "query": Object {
                                "match_phrase": Object {
                                  "category.keyword": "Men's Accessories 5",
                                },
                              },
                            },
                          ],
                          "type": "OR",
                        },
                      },
                    ]
                  }
                />
              </EuiFlexGroup>
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      `);
    });
  });
});
