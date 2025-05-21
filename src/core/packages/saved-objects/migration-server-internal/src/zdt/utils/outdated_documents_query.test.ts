/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { getOutdatedDocumentsQuery } from './outdated_documents_query';
import { createType } from '../test_helpers/saved_object_type';

const dummyModelVersion: SavedObjectsModelVersion = {
  changes: [],
};

const dummyMigration = jest.fn();

describe('getOutdatedDocumentsQuery', () => {
  it('generates the correct query for types using model versions', () => {
    const fooType = createType({
      name: 'foo',
      switchToModelVersionAt: '8.8.0',
      modelVersions: {
        1: dummyModelVersion,
        2: dummyModelVersion,
      },
    });
    const barType = createType({
      name: 'bar',
      switchToModelVersionAt: '8.8.0',
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
                    "range": Object {
                      "typeMigrationVersion": Object {
                        "lt": "10.2.0",
                      },
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
                    "range": Object {
                      "typeMigrationVersion": Object {
                        "lt": "10.3.0",
                      },
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

  it('generates the correct query for types still using old migrations', () => {
    const fooType = createType({
      name: 'foo',
      migrations: {
        '7.17.2': dummyMigration,
        '8.5.0': dummyMigration,
      },
    });
    const barType = createType({
      name: 'bar',
      migrations: () => ({
        '7.15.5': dummyMigration,
        '8.7.2': dummyMigration,
      }),
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
                    "range": Object {
                      "typeMigrationVersion": Object {
                        "lt": "8.5.0",
                      },
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
                    "range": Object {
                      "typeMigrationVersion": Object {
                        "lt": "8.7.2",
                      },
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

  it('generates the correct query for mixed types', () => {
    const fooType = createType({
      name: 'foo',
      migrations: {
        '7.17.2': dummyMigration,
        '8.5.0': dummyMigration,
      },
      switchToModelVersionAt: '8.8.0',
      modelVersions: {
        1: dummyModelVersion,
        2: dummyModelVersion,
      },
    });
    const barType = createType({
      name: 'bar',
      migrations: () => ({
        '7.15.5': dummyMigration,
        '8.7.2': dummyMigration,
      }),
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
                    "range": Object {
                      "typeMigrationVersion": Object {
                        "lt": "10.2.0",
                      },
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
                    "range": Object {
                      "typeMigrationVersion": Object {
                        "lt": "8.7.2",
                      },
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
