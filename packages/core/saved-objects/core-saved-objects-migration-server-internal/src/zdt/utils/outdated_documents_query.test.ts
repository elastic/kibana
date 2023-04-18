/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { getOutdatedDocumentsQuery } from './outdated_documents_query';
import { createType } from '../test_helpers/saved_object_type';

const dummyModelVersion: SavedObjectsModelVersion = {
  modelChange: {
    type: 'expansion',
  },
};

describe('getOutdatedDocumentsQuery', () => {
  it('generates the correct query', () => {
    const fooType = createType({
      name: 'foo',
      modelVersions: {
        1: dummyModelVersion,
        2: dummyModelVersion,
      },
    });
    const barType = createType({
      name: 'bar',
      modelVersions: {
        1: dummyModelVersion,
        2: dummyModelVersion,
        3: dummyModelVersion,
      },
    });

    const query = getOutdatedDocumentsQuery({
      types: [fooType, barType],
    });

    expect(query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "should": Array [
            Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "term": Object {
                      "type": "foo",
                    },
                  },
                  Object {
                    "bool": Object {
                      "should": Array [
                        Object {
                          "bool": Object {
                            "must": Object {
                              "exists": Object {
                                "field": "migrationVersion",
                              },
                            },
                            "must_not": Object {
                              "term": Object {
                                "migrationVersion.foo": "10.2.0",
                              },
                            },
                          },
                        },
                        Object {
                          "bool": Object {
                            "must_not": Array [
                              Object {
                                "exists": Object {
                                  "field": "migrationVersion",
                                },
                              },
                              Object {
                                "term": Object {
                                  "typeMigrationVersion": "10.2.0",
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
            },
            Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "term": Object {
                      "type": "bar",
                    },
                  },
                  Object {
                    "bool": Object {
                      "should": Array [
                        Object {
                          "bool": Object {
                            "must": Object {
                              "exists": Object {
                                "field": "migrationVersion",
                              },
                            },
                            "must_not": Object {
                              "term": Object {
                                "migrationVersion.bar": "10.3.0",
                              },
                            },
                          },
                        },
                        Object {
                          "bool": Object {
                            "must_not": Array [
                              Object {
                                "exists": Object {
                                  "field": "migrationVersion",
                                },
                              },
                              Object {
                                "term": Object {
                                  "typeMigrationVersion": "10.3.0",
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
            },
          ],
        },
      }
    `);
  });
});
