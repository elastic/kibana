/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { DEFAULT_DASHBOARD_STATE } from '../../../common/default_dashboard_state';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import { getChangeHistoryClient } from '../../change_history/change_history_service';
import { setStubKibanaServices } from '../../mocks';
import { getDashboardStateSchema } from '../dashboard_state_schemas';
import { transformDashboardIn } from '../transforms';
import type { DashboardRequestServices } from '../types';
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
  let savedObjectsClient: { get: jest.Mock; update: jest.Mock; changeAccessMode: jest.Mock };
  let supportsAccessControl: boolean;

  beforeAll(() => {
    setStubKibanaServices();
  });

  beforeEach(() => {
    stored = { attributes: getInitialAttributes(), version: 1 };
    loggedSequences = [];

    // in-memory saved objects client with the optimistic concurrency control of the real one
    supportsAccessControl = false;
    savedObjectsClient = {
      changeAccessMode: jest.fn(async (objects: Array<{ type: string; id: string }>) => {
        stored = { ...stored, version: stored.version + 1 };
        return {
          objects: objects.map(({ type, id }) => ({ type, id, version: String(stored.version) })),
        };
      }),
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
    services = {
      savedObjects: {
        client: savedObjectsClient,
        typeRegistry: { supportsAccessControl: () => supportsAccessControl },
      },
      security: { authc: { getCurrentUser: () => null } },
    } as unknown as DashboardRequestServices;

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
    update(services, getDashboardStateSchema(false), ID, getState(title), { spaceId: 'default' });

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

  describe('access mode change', () => {
    const saveWithAccessMode = () =>
      update(
        requestCtx,
        getDashboardStateSchema(false),
        ID,
        { ...getState('Second'), access_control: { access_mode: 'write_restricted' } },
        { spaceId: 'default' }
      );

    beforeEach(() => {
      supportsAccessControl = true;
    });

    it('uses the version returned by changeAccessMode without re-reading the object', async () => {
      await saveWithAccessMode();

      expect(savedObjectsClient.changeAccessMode).toHaveBeenCalledTimes(1);
      // the initial existence check and the read building the response, none in between
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      expect(savedObjectsClient.get.mock.invocationCallOrder[1]).toBeGreaterThan(
        savedObjectsClient.update.mock.invocationCallOrder[0]
      );
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        'dashboard',
        ID,
        expect.anything(),
        expect.objectContaining({ version: '2' })
      );
      expect(stored.version).toBe(3);
    });

    it('throws if changeAccessMode does not return a version', async () => {
      savedObjectsClient.changeAccessMode.mockResolvedValueOnce({
        objects: [{ type: 'dashboard', id: ID }],
      });

      await expect(saveWithAccessMode()).rejects.toThrow(
        'changeAccessMode did not return an updated version'
      );
      expect(savedObjectsClient.update).not.toHaveBeenCalled();
    });

    it('throws the error returned by changeAccessMode', async () => {
      const error = { message: 'nope', statusCode: 403, error: 'Forbidden' };
      savedObjectsClient.changeAccessMode.mockResolvedValueOnce({
        objects: [{ type: 'dashboard', id: ID, error }],
      });

      await expect(saveWithAccessMode()).rejects.toBe(error);
      expect(savedObjectsClient.update).not.toHaveBeenCalled();
    });
  });
});
