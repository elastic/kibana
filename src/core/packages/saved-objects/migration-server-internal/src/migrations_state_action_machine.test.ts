/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { migrationStateActionMachine } from './migrations_state_action_machine';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { LoggerAdapter } from '@kbn/core-logging-server-internal';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { AllControlStates, State } from './state';
import { createInitialState } from './initial_state';
import { ByteSizeValue } from '@kbn/config-schema';

describe('migrationsStateActionMachine', () => {
  beforeAll(() => {
    jest
      .spyOn(global.Date, 'now')
      .mockImplementation(() => new Date('2021-04-12T16:00:00.000Z').valueOf());
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const abort = jest.fn();
  const mockLogger = loggingSystemMock.create();
  const typeRegistry = typeRegistryMock.create();
  const docLinks = docLinksServiceMock.createSetupContract();

  const initialState = createInitialState({
    kibanaVersion: '7.11.0',
    waitForMigrationCompletion: false,
    mustRelocateDocuments: true,
    indexTypes: ['typeA', 'typeB', 'typeC'],
    indexTypesMap: {
      '.kibana': ['typeA', 'typeB', 'typeC'],
      '.kibana_task_manager': ['task'],
      '.kibana_cases': ['typeD', 'typeE'],
    },
    hashToVersionMap: {
      'typeA|someHash': '10.1.0',
      'typeB|someHash': '10.1.0',
      'typeC|someHash': '10.1.0',
      'task|someHash': '10.1.0',
      'typeD|someHash': '10.1.0',
      'typeE|someHash': '10.1.0',
    },
    targetIndexMappings: { properties: {} },
    coreMigrationVersionPerType: {},
    migrationVersionPerType: {},
    indexPrefix: '.my-so-index',
    migrationsConfig: {
      algorithm: 'v2',
      batchSize: 1000,
      maxBatchSizeBytes: new ByteSizeValue(1e8),
      maxReadBatchSizeBytes: new ByteSizeValue(536870888),
      pollInterval: 0,
      scrollDuration: '0s',
      skip: false,
      retryAttempts: 5,
      zdt: {
        metaPickupSyncDelaySec: 120,
        runOnRoles: ['migrator'],
      },
    },
    typeRegistry,
    docLinks,
    esCapabilities: elasticsearchServiceMock.createCapabilities(),
    logger: mockLogger.get(),
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

  it('logs state transitions, messages in state.logs and action responses when reaching DONE', async () => {
    await migrationStateActionMachine({
      initialState,
      logger: mockLogger.get(),
      model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'LEGACY_DELETE', 'DONE']),
      next,
      abort,
    });
    const logs = loggingSystemMock.collect(mockLogger);
    // the 'done' log is the 5th entry in the list
    const doneLog = logs.info.splice(4, 1)[0][0];
    expect(doneLog).toMatch(/\[.my-so-index\] Migration completed after \d+ms/);
    expect(logs).toMatchSnapshot();
  });

  it('logs state transitions, messages in state.logs and action responses when reaching FATAL', async () => {
    await migrationStateActionMachine({
      initialState: {
        ...initialState,
        reason: 'the fatal reason',
        outdatedDocuments: [{ _id: '1234', password: 'sensitive password' }],
        bulkOperationBatches: [
          [[{ index: { _id: '1234' } }, { password: 'sensitive transformed password' }]],
        ],
      } as State,
      logger: mockLogger.get(),
      model: transitionModel(['LEGACY_DELETE', 'FATAL']),
      next,
      abort,
    }).catch((err) => err);
    expect(loggingSystemMock.collect(mockLogger)).toMatchSnapshot();
  });

  // see https://github.com/elastic/kibana/issues/98406
  it('correctly logs state transition when using a logger adapter', async () => {
    const underlyingLogger = mockLogger.get();
    const logger = new LoggerAdapter(underlyingLogger);

    await expect(
      migrationStateActionMachine({
        initialState,
        logger,
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'LEGACY_DELETE', 'DONE']),
        next,
        abort,
      })
    ).resolves.toEqual(expect.anything());

    const allLogs = loggingSystemMock.collect(mockLogger);
    const stateTransitionLogs = allLogs.info
      .map((call) => call[0])
      .filter((log) => log.match('control state'));

    expect(stateTransitionLogs).toMatchInlineSnapshot(`
      Array [
        "[.my-so-index] Log from LEGACY_REINDEX control state",
        "[.my-so-index] Log from LEGACY_DELETE control state",
        "[.my-so-index] Log from LEGACY_DELETE control state",
        "[.my-so-index] Log from DONE control state",
      ]
    `);
  });

  it('resolves when reaching the DONE state', async () => {
    await expect(
      migrationStateActionMachine({
        initialState,
        logger: mockLogger.get(),
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'LEGACY_DELETE', 'DONE']),
        next,
        abort,
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
        abort,
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
        abort,
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
        abort,
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Unable to complete saved object migrations for the [.my-so-index] index: the fatal reason]`
    );
  });

  it('rejects and logs the error when an action throws with a ResponseError', async () => {
    await expect(
      migrationStateActionMachine({
        initialState: { ...initialState, reason: 'the fatal reason' } as State,
        logger: mockLogger.get(),
        model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'FATAL']),
        next: () => {
          throw new errors.ResponseError(
            elasticsearchClientMock.createApiResponse({
              meta: {
                request: { options: {}, id: '', params: { method: 'POST', path: '/mock' } },
              } as any,
              body: {
                error: {
                  type: 'snapshot_in_progress_exception',
                  reason: 'Cannot delete indices that are being snapshotted',
                },
              },
            })
          );
        },
        abort,
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Unable to complete saved object migrations for the [.my-so-index] index. Please check the health of your Elasticsearch cluster and try again. Unexpected Elasticsearch ResponseError: statusCode: 200, method: POST, url: /mock error: [snapshot_in_progress_exception]: Cannot delete indices that are being snapshotted,]`
    );
    expect(loggingSystemMock.collect(mockLogger)).toMatchInlineSnapshot(`
      Object {
        "debug": Array [],
        "error": Array [
          Array [
            "[.my-so-index] Unexpected Elasticsearch ResponseError: statusCode: 200, method: POST, url: /mock error: [snapshot_in_progress_exception]: Cannot delete indices that are being snapshotted,",
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
        abort,
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Unable to complete saved object migrations for the [.my-so-index] index. Error: this action throws]`
    );
    expect(loggingSystemMock.collect(mockLogger)).toMatchInlineSnapshot(`
      Object {
        "debug": Array [],
        "error": Array [
          Array [
            [Error: this action throws],
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
  describe('cleanup', () => {
    it('calls abort function when an action throws', async () => {
      await expect(
        migrationStateActionMachine({
          initialState: { ...initialState, reason: 'the fatal reason' } as State,
          logger: mockLogger.get(),
          model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'FATAL']),
          next: () => {
            throw new Error('this action throws');
          },
          abort,
        })
      ).rejects.toThrow();

      expect(abort).toHaveBeenCalledTimes(1);
    });
    it('calls abort function when reaching the FATAL state', async () => {
      await expect(
        migrationStateActionMachine({
          initialState: { ...initialState, reason: 'the fatal reason' } as State,
          logger: mockLogger.get(),
          model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'FATAL']),
          next,
          abort,
        })
      ).rejects.toThrow();

      expect(abort).toHaveBeenCalledTimes(1);
    });
  });
});
