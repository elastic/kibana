/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { coreMock } from '@kbn/core/public/mocks';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { getMockPresentationContainer } from '@kbn/presentation-publishing/interfaces/containers/mocks';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { ActionExecutionContext, Trigger } from '@kbn/ui-actions-plugin/public';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import { BehaviorSubject, of } from 'rxjs';
import { AddDiscoverSessionPanelAction } from './add_discover_session_panel_action';
import { mockControlState } from '../../__mocks__/esql_controls';

vi.mock('uuid', () => {
  const mocked = {
    v4: vi.fn(() => 'generated-uuid'),
  };
  return { ...mocked, default: mocked };
});

const createEsqlControlApi = (uuid: string, state: OptionsListESQLControlState) => ({
  uuid,
  type: ESQL_CONTROL,
  anyStateChange$: of(),
  serializeState: () => state,
  latestState$: of(state),
  applySerializedState: () => undefined,
});

const createDiscoverSessionTabState = () => ({
  id: 'generated-uuid',
  label: 'New Discover session',
  sort: [],
  columns: [],
  isTextBasedQuery: true,
  grid: {},
  hideChart: false,
  hideTable: false,
  serializedSearchSource: {},
});

describe('AddDiscoverSessionPanelAction', () => {
  const trigger: Trigger = { id: 'TEST_TRIGGER' };
  const application = coreMock.createStart().application;
  const locator = {
    getLocation: vi.fn().mockResolvedValue({ app: 'discover', path: '/new-discover-session' }),
  };
  const navigateToEditor = vi.fn();
  const embeddable = {
    ...embeddablePluginMock.createStartContract(),
    getStateTransfer: vi.fn().mockReturnValue({
      navigateToEditor,
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    locator.getLocation.mockResolvedValue({ app: 'discover', path: '/new-discover-session' });
    embeddable.getStateTransfer.mockReturnValue({ navigateToEditor });
  });

  const createAction = ({ embeddableApi }: { embeddableApi: unknown }) => {
    const action = new AddDiscoverSessionPanelAction(application, locator as never, embeddable);
    const actionContext: ActionExecutionContext<EmbeddableApiContext> = {
      embeddable: embeddableApi as EmbeddableApiContext,
      trigger,
    };

    return {
      action,
      actionContext,
    };
  };

  it('passes dashboard ESQL controls when the embeddable is a presentation container', async () => {
    const { type: _type, ...dashboardControlState } = mockControlState.panel1;
    const serializedDashboardControlState: OptionsListESQLControlState = {
      ...dashboardControlState,
      variable_name: 'host.name',
      title: 'Host name',
    };
    const dashboardControlGroupState = {
      dashboardControl: {
        ...serializedDashboardControlState,
        type: ESQL_CONTROL,
      },
    };
    const embeddableApi = {
      ...getMockPresentationContainer(),
      children$: new BehaviorSubject<Record<string, unknown>>({}),
      getAppContext: vi.fn().mockReturnValue({
        currentAppId: 'dashboard',
        getCurrentPath: vi.fn().mockReturnValue('/dashboard/edit'),
      }),
    };
    embeddableApi.children$.next({
      dashboardControl: createEsqlControlApi('dashboardControl', serializedDashboardControlState),
    });
    const { action, actionContext } = createAction({ embeddableApi });

    await action.execute(actionContext);

    expect(navigateToEditor).toHaveBeenCalledWith('discover', {
      path: '/new-discover-session',
      state: {
        valueInput: {
          discoverSessionTab: createDiscoverSessionTabState(),
          dashboardControlGroupState,
        },
        originatingApp: 'dashboard',
        originatingPath: '/dashboard/edit',
      },
    });
  });

  it('leaves dashboardControlGroupState undefined when the embeddable is not a presentation container', async () => {
    const embeddableApi = {
      getAppContext: vi.fn().mockReturnValue({
        currentAppId: 'dashboard',
        getCurrentPath: vi.fn().mockReturnValue('/dashboard/edit'),
      }),
    };
    const { action, actionContext } = createAction({ embeddableApi });

    await action.execute(actionContext);

    expect(navigateToEditor).toHaveBeenCalledWith('discover', {
      path: '/new-discover-session',
      state: {
        valueInput: {
          discoverSessionTab: createDiscoverSessionTabState(),
          dashboardControlGroupState: undefined,
        },
        originatingApp: 'dashboard',
        originatingPath: '/dashboard/edit',
      },
    });
  });
});
