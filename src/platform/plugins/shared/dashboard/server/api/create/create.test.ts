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
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { DEFAULT_DASHBOARD_STATE } from '../../../common/default_dashboard_state';
import { getChangeHistoryClient } from '../../change_history/change_history_service';
import { setStubKibanaServices } from '../../mocks';
import { getDashboardStateSchema } from '../dashboard_state_schemas';
import { create } from './create';

jest.mock('../../change_history/change_history_service');

const mockedGetClient = getChangeHistoryClient as jest.MockedFunction<
  typeof getChangeHistoryClient
>;

const getState = (title: string): DashboardState => ({ ...DEFAULT_DASHBOARD_STATE, title });

describe('create history sequence', () => {
  const savedObjectsClient = savedObjectsClientMock.create();
  const changeHistoryClient = {
    getHistory: jest.fn(),
    log: jest.fn().mockResolvedValue(undefined),
  };
  const core = {
    savedObjects: {
      client: savedObjectsClient,
      typeRegistry: { supportsAccessControl: () => false },
    },
    security: { authc: { getCurrentUser: () => null } },
  };
  const requestCtx = {
    resolve: async () => ({ core }),
    core: Promise.resolve(core),
  } as unknown as RequestHandlerContext;

  beforeAll(() => {
    setStubKibanaServices();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetClient.mockReturnValue(changeHistoryClient as never);
    savedObjectsClient.create.mockImplementation(async (type, attributes, options) => ({
      id: options?.id ?? 'generated-id',
      type,
      attributes,
      references: [],
    }));
  });

  it('continues after the history of a deleted dashboard with the same ID', async () => {
    // the latest event of the deleted dashboard, which is its delete event
    changeHistoryClient.getHistory.mockResolvedValue({ items: [{ object: { sequence: 4 } }] });

    await create(requestCtx, getDashboardStateSchema(false), getState('Recreated'), { id: 'old' });

    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'dashboard',
      expect.objectContaining({ historySequence: 5 }),
      expect.objectContaining({ id: 'old' })
    );
  });

  it('starts at the initial sequence when there is no history', async () => {
    changeHistoryClient.getHistory.mockResolvedValue({ items: [] });

    await create(requestCtx, getDashboardStateSchema(false), getState('New'), { id: 'new' });

    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'dashboard',
      expect.objectContaining({ historySequence: 1 }),
      expect.anything()
    );
  });
});
