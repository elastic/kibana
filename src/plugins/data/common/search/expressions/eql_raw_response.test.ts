/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EqlRawResponse, eqlRawResponse } from './eql_raw_response';

jest.mock('@kbn/i18n', () => {
  return {
    i18n: {
      translate: (id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
    },
  };
});

describe('eqlRawResponse', () => {
  describe('converts events to table', () => {
    test('simple aggregation response', () => {
      const response: EqlRawResponse = {
        type: 'eql_raw_response',
        body: {
          hits: {
            events: [
              {
                _source: {
                  prop: 'value',
                  prop2: 3,
                },
              },
              {
                _source: {
                  prop: 'value2',
                  prop2: 5,
                },
              },
            ],
          },
        },
      };
      const result = eqlRawResponse.to!.datatable(response, {});
      expect(result).toMatchSnapshot();
    });

    test('extracts total hits number', () => {
      const response: EqlRawResponse = {
        type: 'eql_raw_response',
        body: {
          hits: {
            events: [],
            total: {
              value: 2,
            },
          },
        },
      };
      const result = eqlRawResponse.to!.datatable(response, {});
      expect(result).toHaveProperty('meta.statistics.totalCount', 2);
    });
  });

  describe('converts sequences to table', () => {
    test('simple docs response', () => {
      const response: EqlRawResponse = {
        type: 'eql_raw_response',
        body: {
          hits: {
            sequences: [
              {
                events: [
                  {
                    _index: 'kibana_sample_data_ecommerce',
                    _id: 'AncqUnMBMY_orZma2mZy',
                    _score: 0,
                    _source: {
                      category: ["Men's Clothing"],
                      currency: 'EUR',
                      customer_first_name: 'Oliver',
                      customer_full_name: 'Oliver Rios',
                      customer_gender: 'MALE',
                      products: [
                        {
                          base_price: 20.99,
                          discount_percentage: 0,
                        },
                        {
                          base_price: 24.99,
                          discount_percentage: 0,
                        },
                      ],
                      sku: ['ZO0417504175', 'ZO0535205352'],
                      geoip: {
                        country_iso_code: 'GB',
                        location: {
                          lon: -0.1,
                          lat: 51.5,
                        },
                        continent_name: 'Europe',
                      },
                    },
                  },
                ],
              },
              {
                events: [
                  {
                    _index: 'kibana_sample_data_ecommerce',
                    _id: 'I3cqUnMBMY_orZma2mZy',
                    _score: 0,
                    _source: {
                      category: ["Men's Clothing"],
                      currency: 'EUR',
                      customer_first_name: 'Boris',
                      customer_full_name: 'Boris Bradley',
                      customer_gender: 'MALE',
                      products: [
                        {
                          base_price: 32.99,
                          discount_percentage: 0,
                        },
                        {
                          base_price: 28.99,
                          discount_percentage: 0,
                        },
                      ],
                      sku: ['ZO0112101121', 'ZO0530405304'],
                      geoip: {
                        country_iso_code: 'GB',
                        location: {
                          lon: -0.1,
                          lat: 51.5,
                        },
                        continent_name: 'Europe',
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      };
      const result = eqlRawResponse.to?.datatable(response, {});
      expect(result).toMatchSnapshot();
    });
  });
});
