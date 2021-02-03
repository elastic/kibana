/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { migrationStateActionMachine } from './migrations_state_action_machine';
import { loggingSystemMock } from '../../mocks';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { AllControlStates, State } from './types';
import { createInitialState } from './model';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { elasticsearchClientMock } from '../../elasticsearch/client/mocks';

describe('migrationsStateActionMachine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockLogger = loggingSystemMock.create();

  const initialState = createInitialState({
    kibanaVersion: '7.11.0',
    targetMappings: { properties: {} },
    migrationVersionPerType: {},
    indexPrefix: '.my-so-index',
  });

  const next = jest.fn((s: State) => {
    if (s.controlState === 'DONE' || s.controlState === 'FATAL') {
      return null;
    } else {
      return () => Promise.resolve(Either.right('response'));
    }
  });

  // A model that transitions through all the provided states
  const transitionModel = (states: AllControlStates[]) => {
    let i = 0;
    return (s: State, res: Either.Either<unknown, string>): State => {
      if (i < states.length) {
        const newState = {
          ...s,
          controlState: states[i],
          logs: [...s.logs, { level: 'info', message: `Log from ${states[i]} control state` }],
        } as State;
        i++;
        return newState;
      } else {
        throw new Error("states didn't contain a terminal state");
      }
    };
  };

  it('logs state transitions, messages in state.logs and action responses', async () => {
    await migrationStateActionMachine({
      initialState,
      logger: mockLogger.get(),
      model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'LEGACY_DELETE', 'DONE']),
      next,
    });
    const logs = loggingSystemMock.collect(mockLogger);
    const doneLog = logs.info.splice(8, 1)[0][0];
    expect(doneLog).toMatch(/\[.my-so-index\] Migration completed after \d+ms/);
    expect(logs).toMatchInlineSnapshot(`
      Object {
        "debug": Array [
          Array [
            "[.my-so-index] INIT RESPONSE",
            Object {
              "_tag": "Right",
              "right": "response",
            },
          ],
          Array [
            "[.my-so-index] LEGACY_REINDEX RESPONSE",
            Object {
              "_tag": "Right",
              "right": "response",
            },
          ],
          Array [
            "[.my-so-index] LEGACY_DELETE RESPONSE",
            Object {
              "_tag": "Right",
              "right": "response",
            },
          ],
          Array [
            "[.my-so-index] LEGACY_DELETE RESPONSE",
            Object {
              "_tag": "Right",
              "right": "response",
            },
          ],
        ],
        "error": Array [],
        "fatal": Array [],
        "info": Array [
          Array [
            "[.my-so-index] Log from LEGACY_REINDEX control state",
          ],
          Array [
            "[.my-so-index] INIT -> LEGACY_REINDEX",
          ],
          Array [
            "[.my-so-index] Log from LEGACY_DELETE control state",
          ],
          Array [
            "[.my-so-index] LEGACY_REINDEX -> LEGACY_DELETE",
          ],
          Array [
            "[.my-so-index] Log from LEGACY_DELETE control state",
          ],
          Array [
            "[.my-so-index] LEGACY_DELETE -> LEGACY_DELETE",
          ],
          Array [
            "[.my-so-index] Log from DONE control state",
          ],
          Array [
            "[.my-so-index] LEGACY_DELETE -> DONE",
          ],
        ],
        "log": Array [],
        "trace": Array [],
        "warn": Array [],
      }
    `);
  });
  it('resolves when reaching the DONE state', async () => {
    await expect(
      migrationStateActionMachine({
        initialState,
        logger: mockLogger.get(),
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'LEGACY_DELETE', 'DONE']),
        next,
      })
    ).resolves.toEqual(expect.anything());
  });
  it('resolves with migrated status if some sourceIndex in the DONE state', async () => {
    await expect(
      migrationStateActionMachine({
        initialState: { ...initialState, ...{ sourceIndex: Option.some('source-index') } },
        logger: mockLogger.get(),
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'LEGACY_DELETE', 'DONE']),
        next,
      })
    ).resolves.toEqual(expect.objectContaining({ status: 'migrated' }));
  });
  it('resolves with patched status if none sourceIndex in the DONE state', async () => {
    await expect(
      migrationStateActionMachine({
        initialState: { ...initialState, ...{ sourceIndex: Option.none } },
        logger: mockLogger.get(),
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'LEGACY_DELETE', 'DONE']),
        next,
      })
    ).resolves.toEqual(expect.objectContaining({ status: 'patched' }));
  });
  it('rejects with error message when reaching the FATAL state', async () => {
    await expect(
      migrationStateActionMachine({
        initialState: { ...initialState, reason: 'the fatal reason' } as State,
        logger: mockLogger.get(),
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'FATAL']),
        next,
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Unable to complete saved object migrations for the [.my-so-index] index: the fatal reason]`
    );
  });
  it('logs all state transitions and action responses when reaching the FATAL state', async () => {
    await migrationStateActionMachine({
      initialState: {
        ...initialState,
        reason: 'the fatal reason',
        outdatedDocuments: [{ _id: '1234', password: 'sensitive password' }],
      } as State,
      logger: mockLogger.get(),
      model: transitionModel(['LEGACY_DELETE', 'FATAL']),
      next,
    }).catch((err) => err);
    // Ignore the first 4 log entries that come from our model
    const executionLogLogs = loggingSystemMock.collect(mockLogger).info.slice(4);
    expect(executionLogLogs).toMatchInlineSnapshot(`
      Array [
        Array [
          "[.my-so-index] INIT RESPONSE",
          Object {
            "_tag": "Right",
            "right": "response",
          },
        ],
        Array [
          "[.my-so-index] INIT -> LEGACY_DELETE",
          Object {
            "controlState": "LEGACY_DELETE",
            "currentAlias": ".my-so-index",
            "indexPrefix": ".my-so-index",
            "kibanaVersion": "7.11.0",
            "legacyIndex": ".my-so-index",
            "logs": Array [
              Object {
                "level": "info",
                "message": "Log from LEGACY_DELETE control state",
              },
            ],
            "outdatedDocuments": Array [
              "1234",
            ],
            "outdatedDocumentsQuery": Object {
              "bool": Object {
                "should": Array [],
              },
            },
            "preMigrationScript": Object {
              "_tag": "None",
            },
            "reason": "the fatal reason",
            "retryCount": 0,
            "retryDelay": 0,
            "targetIndexMappings": Object {
              "properties": Object {},
            },
            "tempIndex": ".my-so-index_7.11.0_reindex_temp",
            "tempIndexMappings": Object {
              "dynamic": false,
              "properties": Object {
                "migrationVersion": Object {
                  "dynamic": "true",
                  "type": "object",
                },
                "type": Object {
                  "type": "keyword",
                },
              },
            },
            "versionAlias": ".my-so-index_7.11.0",
            "versionIndex": ".my-so-index_7.11.0_001",
          },
        ],
        Array [
          "[.my-so-index] LEGACY_DELETE RESPONSE",
          Object {
            "_tag": "Right",
            "right": "response",
          },
        ],
        Array [
          "[.my-so-index] LEGACY_DELETE -> FATAL",
          Object {
            "controlState": "FATAL",
            "currentAlias": ".my-so-index",
            "indexPrefix": ".my-so-index",
            "kibanaVersion": "7.11.0",
            "legacyIndex": ".my-so-index",
            "logs": Array [
              Object {
                "level": "info",
                "message": "Log from LEGACY_DELETE control state",
              },
              Object {
                "level": "info",
                "message": "Log from FATAL control state",
              },
            ],
            "outdatedDocuments": Array [
              "1234",
            ],
            "outdatedDocumentsQuery": Object {
              "bool": Object {
                "should": Array [],
              },
            },
            "preMigrationScript": Object {
              "_tag": "None",
            },
            "reason": "the fatal reason",
            "retryCount": 0,
            "retryDelay": 0,
            "targetIndexMappings": Object {
              "properties": Object {},
            },
            "tempIndex": ".my-so-index_7.11.0_reindex_temp",
            "tempIndexMappings": Object {
              "dynamic": false,
              "properties": Object {
                "migrationVersion": Object {
                  "dynamic": "true",
                  "type": "object",
                },
                "type": Object {
                  "type": "keyword",
                },
              },
            },
            "versionAlias": ".my-so-index_7.11.0",
            "versionIndex": ".my-so-index_7.11.0_001",
          },
        ],
      ]
    `);
  });
  it('rejects and logs the error when an action throws with an ResponseError', async () => {
    await expect(
      migrationStateActionMachine({
        initialState: { ...initialState, reason: 'the fatal reason' } as State,
        logger: mockLogger.get(),
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'FATAL']),
        next: () => {
          throw new ResponseError(
            elasticsearchClientMock.createApiResponse({
              body: { error: { type: 'snapshot_in_progress_exception', reason: 'error reason' } },
            })
          );
        },
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Unable to complete saved object migrations for the [.my-so-index] index. Please check the health of your Elasticsearch cluster and try again. ResponseError: snapshot_in_progress_exception]`
    );
    expect(loggingSystemMock.collect(mockLogger)).toMatchInlineSnapshot(`
      Object {
        "debug": Array [],
        "error": Array [
          Array [
            "[.my-so-index] [snapshot_in_progress_exception]: error reason",
          ],
          Array [
            "[.my-so-index] migration failed, dumping execution log:",
          ],
        ],
        "fatal": Array [],
        "info": Array [],
        "log": Array [],
        "trace": Array [],
        "warn": Array [],
      }
    `);
  });
  it('rejects and logs the error when an action throws', async () => {
    await expect(
      migrationStateActionMachine({
        initialState: { ...initialState, reason: 'the fatal reason' } as State,
        logger: mockLogger.get(),
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'FATAL']),
        next: () => {
          throw new Error('this action throws');
        },
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Unable to complete saved object migrations for the [.my-so-index] index. Please check the health of your Elasticsearch cluster and try again. Error: this action throws]`
    );
    expect(loggingSystemMock.collect(mockLogger)).toMatchInlineSnapshot(`
      Object {
        "debug": Array [],
        "error": Array [
          Array [
            [Error: this action throws],
          ],
          Array [
            "[.my-so-index] migration failed, dumping execution log:",
          ],
        ],
        "fatal": Array [],
        "info": Array [],
        "log": Array [],
        "trace": Array [],
        "warn": Array [],
      }
    `);
  });
  it('logs all state transitions and action responses when an action throws', async () => {
    try {
      await migrationStateActionMachine({
        initialState: { ...initialState, reason: 'the fatal reason' } as State,
        logger: mockLogger.get(),
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'FATAL']),
        next: (state) => {
          if (state.controlState === 'LEGACY_DELETE') throw new Error('this action throws');
          return () => Promise.resolve('hello');
        },
      });
    } catch (e) {
      /** ignore */
    }
    // Ignore the first 4 log entries that come from our model
    const executionLogLogs = loggingSystemMock.collect(mockLogger).info.slice(4);
    expect(executionLogLogs).toMatchInlineSnapshot(`
      Array [
        Array [
          "[.my-so-index] INIT RESPONSE",
          "hello",
        ],
        Array [
          "[.my-so-index] INIT -> LEGACY_REINDEX",
          Object {
            "controlState": "LEGACY_REINDEX",
            "currentAlias": ".my-so-index",
            "indexPrefix": ".my-so-index",
            "kibanaVersion": "7.11.0",
            "legacyIndex": ".my-so-index",
            "logs": Array [
              Object {
                "level": "info",
                "message": "Log from LEGACY_REINDEX control state",
              },
            ],
            "outdatedDocuments": Array [],
            "outdatedDocumentsQuery": Object {
              "bool": Object {
                "should": Array [],
              },
            },
            "preMigrationScript": Object {
              "_tag": "None",
            },
            "reason": "the fatal reason",
            "retryCount": 0,
            "retryDelay": 0,
            "targetIndexMappings": Object {
              "properties": Object {},
            },
            "tempIndex": ".my-so-index_7.11.0_reindex_temp",
            "tempIndexMappings": Object {
              "dynamic": false,
              "properties": Object {
                "migrationVersion": Object {
                  "dynamic": "true",
                  "type": "object",
                },
                "type": Object {
                  "type": "keyword",
                },
              },
            },
            "versionAlias": ".my-so-index_7.11.0",
            "versionIndex": ".my-so-index_7.11.0_001",
          },
        ],
        Array [
          "[.my-so-index] LEGACY_REINDEX RESPONSE",
          "hello",
        ],
        Array [
          "[.my-so-index] LEGACY_REINDEX -> LEGACY_DELETE",
          Object {
            "controlState": "LEGACY_DELETE",
            "currentAlias": ".my-so-index",
            "indexPrefix": ".my-so-index",
            "kibanaVersion": "7.11.0",
            "legacyIndex": ".my-so-index",
            "logs": Array [
              Object {
                "level": "info",
                "message": "Log from LEGACY_REINDEX control state",
              },
              Object {
                "level": "info",
                "message": "Log from LEGACY_DELETE control state",
              },
            ],
            "outdatedDocuments": Array [],
            "outdatedDocumentsQuery": Object {
              "bool": Object {
                "should": Array [],
              },
            },
            "preMigrationScript": Object {
              "_tag": "None",
            },
            "reason": "the fatal reason",
            "retryCount": 0,
            "retryDelay": 0,
            "targetIndexMappings": Object {
              "properties": Object {},
            },
            "tempIndex": ".my-so-index_7.11.0_reindex_temp",
            "tempIndexMappings": Object {
              "dynamic": false,
              "properties": Object {
                "migrationVersion": Object {
                  "dynamic": "true",
                  "type": "object",
                },
                "type": Object {
                  "type": "keyword",
                },
              },
            },
            "versionAlias": ".my-so-index_7.11.0",
            "versionIndex": ".my-so-index_7.11.0_001",
          },
        ],
      ]
    `);
  });
});
