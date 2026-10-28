/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { DEFAULT_DASHBOARD_STATE } from '../../../common/default_dashboard_state';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import { getChangeHistoryClient } from '../../change_history/change_history_service';
import { setStubKibanaServices } from '../../mocks';
import { getDashboardStateSchema } from '../dashboard_state_schemas';
import { transformDashboardIn } from '../transforms';
import { update } from './update';

jest.mock('../../change_history/change_history_service');

const mockedGetClient = getChangeHistoryClient as jest.MockedFunction<
  typeof getChangeHistoryClient
>;

const ID = 'dash-1';

const getState = (title: string): DashboardState => ({ ...DEFAULT_DASHBOARD_STATE, title });
const getInitialAttributes = (): DashboardSavedObjectAttributes => ({
  ...transformDashboardIn(getState('Initial'), false).attributes,
  historySequence: 1,
});

describe('update history sequence', () => {
  let stored: { attributes: DashboardSavedObjectAttributes; version: number };
  let loggedSequences: number[];
  let requestCtx: RequestHandlerContext;

  beforeAll(() => {
    setStubKibanaServices();
  });

  beforeEach(() => {
    stored = { attributes: getInitialAttributes(), version: 1 };
    loggedSequences = [];

    // in-memory saved objects client with the optimistic concurrency control of the real one
    const savedObjectsClient = {
      get: jest.fn(async () => ({
        id: ID,
        type: 'dashboard',
        attributes: { ...stored.attributes },
        references: [],
        version: String(stored.version),
      })),
      update: jest.fn(
        async (
          type: string,
          id: string,
          attributes: DashboardSavedObjectAttributes,
          options: { version?: string }
        ) => {
          if (options.version !== String(stored.version)) {
            throw SavedObjectsErrorHelpers.createConflictError(type, id);
          }
          stored = { attributes, version: stored.version + 1 };
          return { id, type, attributes, references: [], version: String(stored.version) };
        }
      ),
    };
    const core = {
      savedObjects: {
        client: savedObjectsClient,
        typeRegistry: { supportsAccessControl: () => false },
      },
      security: { authc: { getCurrentUser: () => null } },
    };
    requestCtx = {
      resolve: async () => ({ core }),
      core: Promise.resolve(core),
    } as unknown as RequestHandlerContext;

    // history that never refreshes: it only ever returns the first version
    mockedGetClient.mockResolvedValue({
      getHistory: jest.fn().mockResolvedValue({
        items: [{ object: { sequence: 1, snapshot: { title: 'Initial' } } }],
      }),
      log: jest.fn(async (change: { sequence: number }) => {
        loggedSequences.push(change.sequence);
      }),
    } as never);
  });

  const save = (title: string) =>
    update(requestCtx, getDashboardStateSchema(false), ID, getState(title), { spaceId: 'default' });

  it('gives sequential saves distinct sequences before the history refreshes', async () => {
    await save('Second');
    await save('Third');

    expect(loggedSequences).toEqual([2, 3]);
    expect(stored.attributes.historySequence).toBe(3);
  });

  it('rejects a concurrent save instead of reusing its sequence', async () => {
    const results = await Promise.allSettled([save('Second'), save('Third')]);

    expect(results.map(({ status }) => status)).toEqual(['fulfilled', 'rejected']);
    expect(loggedSequences).toEqual([2]);
    expect(stored.attributes.historySequence).toBe(2);
  });

  it('keeps the sequence when the content is unchanged', async () => {
    await save('Initial');

    expect(loggedSequences).toEqual([]);
    expect(stored.attributes.historySequence).toBe(1);
  });
});
