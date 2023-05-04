/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { query } from './query';

import type {
  AnnotationsRequestProcessorsFunction,
  AnnotationsRequestProcessorsParams,
} from './types';
import { DefaultSearchCapabilities } from '../../../search_strategies/capabilities/default_search_capabilities';

describe('query', () => {
  let req: AnnotationsRequestProcessorsParams['req'];
  let panel: AnnotationsRequestProcessorsParams['panel'];
  let annotation: AnnotationsRequestProcessorsParams['annotation'];
  let esQueryConfig: AnnotationsRequestProcessorsParams['esQueryConfig'];
  let annotationIndex: AnnotationsRequestProcessorsParams['annotationIndex'];
  let capabilities: AnnotationsRequestProcessorsParams['capabilities'];
  let uiSettings: AnnotationsRequestProcessorsParams['uiSettings'];

  const next = jest.fn((x) => x) as unknown as ReturnType<
    ReturnType<AnnotationsRequestProcessorsFunction>
  >;

  beforeEach(() => {
    req = {
      body: {
        timerange: {
          timezone: 'Europe/Minsk',
          min: '2022-01-29T22:03:02.317Z',
          max: '2022-02-07T09:00:00.000Z',
        },
      },
    } as AnnotationsRequestProcessorsParams['req'];
    panel = {} as AnnotationsRequestProcessorsParams['panel'];
    annotation = {
      time_field: 'fooField',
    } as AnnotationsRequestProcessorsParams['annotation'];
    annotationIndex = {
      indexPattern: undefined,
      indexPatternString: 'foo*',
    };
    capabilities = {
      getValidTimeInterval: jest.fn((x) => x),
    } as unknown as DefaultSearchCapabilities;
    uiSettings = {
      get: jest.fn().mockResolvedValue(100),
    } as unknown as AnnotationsRequestProcessorsParams['uiSettings'];
  });

  test('should set "size" to 0', async () => {
    const doc = await query({
      req,
      panel,
      annotation,
      esQueryConfig,
      annotationIndex,
      capabilities,
      uiSettings,
    } as AnnotationsRequestProcessorsParams)(next)({});

    expect(doc.size).toBe(0);
  });

  test('should apply global query (Lucene)', async () => {
    req.body.query = [
      {
        query: 'hour_of_day : 1',
        language: 'lucene',
      },
    ];

    annotation.ignore_global_filters = 0;

    const doc = await query({
      req,
      panel,
      annotation,
      esQueryConfig,
      annotationIndex,
      capabilities,
      uiSettings,
    } as AnnotationsRequestProcessorsParams)(next)({});

    expect(doc.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [],
          "must": Array [
            Object {
              "query_string": Object {
                "query": "hour_of_day : 1",
              },
            },
            Object {
              "range": Object {
                "fooField": Object {
                  "format": "strict_date_optional_time",
                  "gte": "2022-01-29T22:03:02.317Z",
                  "lte": "2022-02-07T08:00:00.000Z",
                },
              },
            },
          ],
          "must_not": Array [],
          "should": Array [],
        },
      }
    `);
  });

  test('should apply global query (KQL)', async () => {
    req.body.query = [
      {
        query: 'hour_of_day : 1',
        language: 'kuery',
      },
    ];

    annotation.ignore_global_filters = 0;

    const doc = await query({
      req,
      panel,
      annotation,
      esQueryConfig,
      annotationIndex,
      capabilities,
      uiSettings,
    } as AnnotationsRequestProcessorsParams)(next)({});

    expect(doc.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "match": Object {
                      "hour_of_day": "1",
                    },
                  },
                ],
              },
            },
          ],
          "must": Array [
            Object {
              "range": Object {
                "fooField": Object {
                  "format": "strict_date_optional_time",
                  "gte": "2022-01-29T22:03:02.317Z",
                  "lte": "2022-02-07T08:00:00.000Z",
                },
              },
            },
          ],
          "must_not": Array [],
          "should": Array [],
        },
      }
    `);
  });

  test('should apply global filters', async () => {
    req.body.filters = [
      {
        meta: {
          index: '90943e30-9a47-11e8-b64d-95841ca0b247',
          alias: null,
          negate: false,
          disabled: false,
          type: 'exists',
          key: 'referer',
          value: 'exists',
        },
        query: {
          exists: {
            field: 'referer',
          },
        },
      },
    ];

    annotation.ignore_global_filters = 0;

    const doc = await query({
      req,
      panel,
      annotation,
      esQueryConfig,
      annotationIndex,
      capabilities,
      uiSettings,
    } as AnnotationsRequestProcessorsParams)(next)({});

    expect(doc.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "exists": Object {
                "field": "referer",
              },
            },
          ],
          "must": Array [
            Object {
              "range": Object {
                "fooField": Object {
                  "format": "strict_date_optional_time",
                  "gte": "2022-01-29T22:03:02.317Z",
                  "lte": "2022-02-07T08:00:00.000Z",
                },
              },
            },
          ],
          "must_not": Array [],
          "should": Array [],
        },
      }
    `);
  });

  test('should add panel filters and merge it with global one', async () => {
    req.body.query = [
      {
        query: 'hour_of_day : 1',
        language: 'kuery',
      },
    ];

    panel.filter = {
      query: 'agent : 2',
      language: 'kuery',
    };

    annotation.ignore_global_filters = 0;
    annotation.ignore_panel_filters = 0;

    const doc = await query({
      req,
      panel,
      annotation,
      esQueryConfig,
      annotationIndex,
      capabilities,
      uiSettings,
    } as AnnotationsRequestProcessorsParams)(next)({});

    expect(doc.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "match": Object {
                      "hour_of_day": "1",
                    },
                  },
                ],
              },
            },
          ],
          "must": Array [
            Object {
              "range": Object {
                "fooField": Object {
                  "format": "strict_date_optional_time",
                  "gte": "2022-01-29T22:03:02.317Z",
                  "lte": "2022-02-07T08:00:00.000Z",
                },
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
                            "agent": "2",
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
          ],
          "must_not": Array [],
          "should": Array [],
        },
      }
    `);
  });

  test('should ignore global and panel filters/queries ', async () => {
    req.body.query = [
      {
        query: 'hour_of_day : 1',
        language: 'kuery',
      },
    ];

    req.body.filters = [
      {
        meta: {
          index: '90943e30-9a47-11e8-b64d-95841ca0b247',
          alias: null,
          negate: false,
          disabled: false,
          type: 'exists',
          key: 'referer',
          value: 'exists',
        },
        query: {
          exists: {
            field: 'referer',
          },
        },
      },
    ];

    panel.filter = {
      query: 'agent : 2',
      language: 'kuery',
    };

    annotation.ignore_global_filters = 1;
    annotation.ignore_panel_filters = 1;

    const doc = await query({
      req,
      panel,
      annotation,
      esQueryConfig,
      annotationIndex,
      capabilities,
      uiSettings,
    } as AnnotationsRequestProcessorsParams)(next)({});

    expect(doc.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [],
          "must": Array [
            Object {
              "range": Object {
                "fooField": Object {
                  "format": "strict_date_optional_time",
                  "gte": "2022-01-29T22:03:02.317Z",
                  "lte": "2022-02-07T08:00:00.000Z",
                },
              },
            },
          ],
          "must_not": Array [],
          "should": Array [],
        },
      }
    `);
  });

  test('should add annotation query ', async () => {
    annotation.query_string = {
      query: 'hour_of_day : 1',
      language: 'kuery',
    };

    const doc = await query({
      req,
      panel,
      annotation,
      esQueryConfig,
      annotationIndex,
      capabilities,
      uiSettings,
    } as AnnotationsRequestProcessorsParams)(next)({});

    expect(doc.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [],
          "must": Array [
            Object {
              "range": Object {
                "fooField": Object {
                  "format": "strict_date_optional_time",
                  "gte": "2022-01-29T22:03:02.317Z",
                  "lte": "2022-02-07T08:00:00.000Z",
                },
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
                            "hour_of_day": "1",
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
          ],
          "must_not": Array [],
          "should": Array [],
        },
      }
    `);
  });
});
