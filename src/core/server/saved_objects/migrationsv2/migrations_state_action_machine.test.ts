/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { migrationStateActionMachine } from './migrations_state_action_machine';
import { loggingSystemMock } from '../../mocks';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { AllControlStates, State } from './types';
import { createInitialState } from './model';

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
    expect(loggingSystemMock.collect(mockLogger)).toMatchInlineSnapshot(`
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
            "[.my-so-index] INIT -> LEGACY_REINDEX",
            Object {
              "controlState": "LEGACY_REINDEX",
              "currentAlias": ".my-so-index",
              "indexPrefix": ".my-so-index",
              "kibanaVersion": "7.11.0",
              "legacyIndex": ".my-so-index",
              "outdatedDocumentsQuery": Object {
                "bool": Object {
                  "should": Array [],
                },
              },
              "preMigrationScript": Object {
                "_tag": "None",
              },
              "retryCount": 0,
              "retryDelay": 0,
              "targetMappings": Object {
                "properties": Object {},
              },
              "versionAlias": ".my-so-index_7.11.0",
              "versionIndex": ".my-so-index_7.11.0_001",
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
            "[.my-so-index] LEGACY_REINDEX -> LEGACY_DELETE",
            Object {
              "controlState": "LEGACY_DELETE",
              "currentAlias": ".my-so-index",
              "indexPrefix": ".my-so-index",
              "kibanaVersion": "7.11.0",
              "legacyIndex": ".my-so-index",
              "outdatedDocumentsQuery": Object {
                "bool": Object {
                  "should": Array [],
                },
              },
              "preMigrationScript": Object {
                "_tag": "None",
              },
              "retryCount": 0,
              "retryDelay": 0,
              "targetMappings": Object {
                "properties": Object {},
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
            "[.my-so-index] LEGACY_DELETE -> LEGACY_DELETE",
            Object {
              "controlState": "LEGACY_DELETE",
              "currentAlias": ".my-so-index",
              "indexPrefix": ".my-so-index",
              "kibanaVersion": "7.11.0",
              "legacyIndex": ".my-so-index",
              "outdatedDocumentsQuery": Object {
                "bool": Object {
                  "should": Array [],
                },
              },
              "preMigrationScript": Object {
                "_tag": "None",
              },
              "retryCount": 0,
              "retryDelay": 0,
              "targetMappings": Object {
                "properties": Object {},
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
            "[.my-so-index] LEGACY_DELETE -> DONE",
            Object {
              "controlState": "DONE",
              "currentAlias": ".my-so-index",
              "indexPrefix": ".my-so-index",
              "kibanaVersion": "7.11.0",
              "legacyIndex": ".my-so-index",
              "outdatedDocumentsQuery": Object {
                "bool": Object {
                  "should": Array [],
                },
              },
              "preMigrationScript": Object {
                "_tag": "None",
              },
              "retryCount": 0,
              "retryDelay": 0,
              "targetMappings": Object {
                "properties": Object {},
              },
              "versionAlias": ".my-so-index_7.11.0",
              "versionIndex": ".my-so-index_7.11.0_001",
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
  it('resolves when reaching the DONE state', () => {
    return expect(
      migrationStateActionMachine({
        initialState,
        logger: mockLogger.get(),
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'LEGACY_DELETE', 'DONE']),
        next,
      })
    ).resolves.toEqual(expect.anything());
  });
  it('resolves with migrated status if some sourceIndex in the DONE state', () => {
    return expect(
      migrationStateActionMachine({
        initialState: { ...initialState, ...{ sourceIndex: Option.some('source-index') } },
        logger: mockLogger.get(),
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'LEGACY_DELETE', 'DONE']),
        next,
      })
    ).resolves.toEqual(expect.objectContaining({ status: 'migrated' }));
  });
  it('resolves with patched status if none sourceIndex in the DONE state', () => {
    return expect(
      migrationStateActionMachine({
        initialState: { ...initialState, ...{ sourceIndex: Option.none } },
        logger: mockLogger.get(),
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'LEGACY_DELETE', 'DONE']),
        next,
      })
    ).resolves.toEqual(expect.objectContaining({ status: 'patched' }));
  });
  it('rejects with error message when reaching the FATAL state', () => {
    return expect(
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
      `[Error: Unable to complete saved object migrations for the [.my-so-index] index. Please check the health of your Elasticsearch cluster]`
    );
    expect(loggingSystemMock.collect(mockLogger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: this action throws],
        ],
      ]
    `);
  });
});
