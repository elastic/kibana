/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cleanupMock } from './migrations_state_machine_cleanup.mocks';
import { migrationStateActionMachine } from './migrations_state_action_machine';
import { loggingSystemMock, elasticsearchServiceMock, docLinksServiceMock } from '../../mocks';
import { typeRegistryMock } from '../saved_objects_type_registry.mock';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '../../elasticsearch/client/mocks';
import { LoggerAdapter } from '../../logging/logger_adapter';
import { AllControlStates, State } from './state';
import { createInitialState } from './initial_state';
import { ByteSizeValue } from '@kbn/config-schema';

const esClient = elasticsearchServiceMock.createElasticsearchClient();
describe('migrationsStateActionMachine', () => {
  beforeAll(() => {
    jest
      .spyOn(global.Date, 'now')
      .mockImplementation(() => new Date('2021-04-12T16:00:00.000Z').valueOf());
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockLogger = loggingSystemMock.create();
  const typeRegistry = typeRegistryMock.create();
  const docLinks = docLinksServiceMock.createSetupContract();
  const initialState = createInitialState({
    kibanaVersion: '7.11.0',
    targetMappings: { properties: {} },
    migrationVersionPerType: {},
    indexPrefix: '.my-so-index',
    migrationsConfig: {
      batchSize: 1000,
      maxBatchSizeBytes: new ByteSizeValue(1e8),
      pollInterval: 0,
      scrollDuration: '0s',
      skip: false,
      retryAttempts: 5,
    },
    typeRegistry,
    docLinks,
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
      client: esClient,
    });
    const logs = loggingSystemMock.collect(mockLogger);
    const doneLog = logs.info.splice(8, 1)[0][0];
    expect(doneLog).toMatch(/\[.my-so-index\] Migration completed after \d+ms/);
    expect(logs).toMatchSnapshot();
  });

  it('logs state transitions, messages in state.logs and action responses when reaching FATAL', async () => {
    await migrationStateActionMachine({
      initialState: {
        ...initialState,
        reason: 'the fatal reason',
        outdatedDocuments: [{ _id: '1234', password: 'sensitive password' }],
        transformedDocBatches: [[{ _id: '1234', password: 'sensitive transformed password' }]],
      } as State,
      logger: mockLogger.get(),
      model: transitionModel(['LEGACY_DELETE', 'FATAL']),
      next,
      client: esClient,
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
        client: esClient,
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
        client: esClient,
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
        client: esClient,
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
        client: esClient,
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
        client: esClient,
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
        client: esClient,
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
        client: esClient,
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
    beforeEach(() => {
      cleanupMock.mockClear();
    });
    it('calls cleanup function when an action throws', async () => {
      await expect(
        migrationStateActionMachine({
          initialState: { ...initialState, reason: 'the fatal reason' } as State,
          logger: mockLogger.get(),
          model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'FATAL']),
          next: () => {
            throw new Error('this action throws');
          },
          client: esClient,
        })
      ).rejects.toThrow();

      expect(cleanupMock).toHaveBeenCalledTimes(1);
    });
    it('calls cleanup function when reaching the FATAL state', async () => {
      await expect(
        migrationStateActionMachine({
          initialState: { ...initialState, reason: 'the fatal reason' } as State,
          logger: mockLogger.get(),
          model: transitionModel(['LEGACY_REINDEX', 'LEGACY_DELETE', 'FATAL']),
          next,
          client: esClient,
        })
      ).rejects.toThrow();

      expect(cleanupMock).toHaveBeenCalledTimes(1);
    });
  });
});
