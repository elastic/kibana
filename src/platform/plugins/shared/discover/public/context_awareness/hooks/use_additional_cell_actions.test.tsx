/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { DISCOVER_CELL_ACTIONS_TRIGGER_ID } from '@kbn/ui-actions-plugin/common/trigger_ids';
import {
  DISCOVER_CELL_ACTION_TYPE,
  createCellAction,
  toCellActionContext,
  useAdditionalCellActions,
} from './use_additional_cell_actions';
import { discoverServiceMock } from '../../__mocks__/services';
import React from 'react';
import { createEsqlDataSource } from '../../../common/data_sources';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import type {
  Action,
  ActionDefinition,
  ActionExecutionContext,
} from '@kbn/ui-actions-plugin/public/actions';
import { type AdditionalCellAction, type DiscoverCellActionExecutionContext } from '../types';
import { createContextAwarenessMocks } from '../__mocks__';
import { type ScopedProfilesManager } from '../profiles_manager';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import { v4 as uuidv4 } from 'uuid';
import type { ScopedDiscoverEBTManager } from '../../ebt_manager';
import { triggers } from '@kbn/ui-actions-plugin/public';

let mockScopedProfilesManager: ScopedProfilesManager;
let mockScopedEbtManager: ScopedDiscoverEBTManager;
let mockUuid = 0;

jest.mock('uuid', () => ({ ...jest.requireActual('uuid'), v4: jest.fn() }));

const mockActions: Array<ActionDefinition<DiscoverCellActionExecutionContext>> = [];
const mockTriggerActions: Record<string, string[]> = { [DISCOVER_CELL_ACTIONS_TRIGGER_ID]: [] };

jest.spyOn(discoverServiceMock.uiActions, 'registerAction').mockImplementation((action) => {
  mockActions.push(action as ActionDefinition<DiscoverCellActionExecutionContext>);
  return action as Action;
});

jest
  .spyOn(discoverServiceMock.uiActions, 'attachAction')
  .mockImplementation((triggerId, actionId) => {
    mockTriggerActions[triggerId].push(actionId);
  });

jest.spyOn(discoverServiceMock.uiActions, 'unregisterAction').mockImplementation((id) => {
  mockActions.splice(
    mockActions.findIndex((action) => action.id === id),
    1
  );
});

jest
  .spyOn(discoverServiceMock.uiActions, 'detachAction')
  .mockImplementation((triggerId, actionId) => {
    mockTriggerActions[triggerId].splice(
      mockTriggerActions[triggerId].findIndex((action) => action === actionId),
      1
    );
  });

describe('useAdditionalCellActions', () => {
  const initialProps: React.PropsWithChildren<Parameters<typeof useAdditionalCellActions>[0]> = {
    dataSource: createEsqlDataSource(),
    dataView: dataViewWithTimefieldMock,
    query: { esql: `FROM ${dataViewWithTimefieldMock.getIndexPattern()}` },
    filters: [],
    timeRange: { from: 'now-15m', to: 'now' },
  };

  const render = () => {
    return renderHook(useAdditionalCellActions, {
      initialProps,
      wrapper: ({ children }) => (
        <DiscoverTestProvider
          services={discoverServiceMock}
          scopedProfilesManager={mockScopedProfilesManager}
          scopedEbtManager={mockScopedEbtManager}
        >
          {children}
        </DiscoverTestProvider>
      ),
    });
  };

  beforeEach(() => {
    (uuidv4 as jest.Mock).mockImplementation(jest.requireActual('uuid').v4);
    const { profilesManagerMock, scopedEbtManagerMock } = createContextAwarenessMocks();
    discoverServiceMock.profilesManager = profilesManagerMock;
    mockScopedEbtManager = scopedEbtManagerMock;
    mockScopedProfilesManager = discoverServiceMock.profilesManager.createScopedProfilesManager({
      scopedEbtManager: mockScopedEbtManager,
    });
    (uuidv4 as jest.Mock).mockImplementation(() => (++mockUuid).toString());
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockUuid = 0;
  });

  it('should return metadata', async () => {
    const { result, unmount } = render();
    expect(result.current).toEqual({
      instanceId: '1',
      ...initialProps,
    });
    unmount();
  });

  it('should register and unregister cell actions', async () => {
    await discoverServiceMock.profilesManager.resolveRootProfile({});
    const { rerender, result, unmount } = render();
    expect(result.current.instanceId).toEqual('1');
    expect(mockActions).toHaveLength(1);
    expect(mockTriggerActions[DISCOVER_CELL_ACTIONS_TRIGGER_ID]).toEqual(['root-action-2']);
    await act(() => mockScopedProfilesManager.resolveDataSourceProfile({}));
    rerender(initialProps);
    expect(result.current.instanceId).toEqual('3');
    expect(mockActions).toHaveLength(2);
    expect(mockTriggerActions[DISCOVER_CELL_ACTIONS_TRIGGER_ID]).toEqual([
      'root-action-4',
      'data-source-action-5',
    ]);
    unmount();
    expect(mockActions).toHaveLength(0);
    expect(mockTriggerActions[DISCOVER_CELL_ACTIONS_TRIGGER_ID]).toEqual([]);
  });
});

describe('createCellAction', () => {
  const context: ActionExecutionContext<DiscoverCellActionExecutionContext> = {
    data: [
      {
        field: dataViewWithTimefieldMock.getFieldByName('message')?.toSpec()!,
        value: 'test message',
      },
    ],
    metadata: undefined,
    nodeRef: React.createRef(),
    trigger: triggers[DISCOVER_CELL_ACTIONS_TRIGGER_ID],
  };

  const getCellAction = (isCompatible?: AdditionalCellAction['isCompatible']) => {
    const additional: AdditionalCellAction = {
      id: 'test',
      getIconType: jest.fn(() => 'plus'),
      getDisplayName: jest.fn(() => 'displayName'),
      execute: jest.fn(),
      isCompatible,
    };
    return { additional, action: createCellAction('test', additional, 0) };
  };

  it('should create cell action', () => {
    const { action } = getCellAction();
    expect(action).toEqual({
      id: 'test-1',
      order: 0,
      type: DISCOVER_CELL_ACTION_TYPE,
      getIconType: expect.any(Function),
      getDisplayName: expect.any(Function),
      getDisplayNameTooltip: expect.any(Function),
      execute: expect.any(Function),
      isCompatible: expect.any(Function),
    });
  });

  it('should get icon type', () => {
    const { additional, action } = getCellAction();
    expect(action.getIconType(context)).toEqual('plus');
    expect(additional.getIconType).toHaveBeenCalledWith(toCellActionContext(context));
  });

  it('should get display name', () => {
    const { additional, action } = getCellAction();
    expect(action.getDisplayName(context)).toEqual('displayName');
    expect(action.getDisplayNameTooltip?.(context)).toEqual('displayName');
    expect(additional.getDisplayName).toHaveBeenCalledWith(toCellActionContext(context));
  });

  it('should execute', async () => {
    const { additional, action } = getCellAction();
    await action.execute(context);
    expect(additional.execute).toHaveBeenCalledWith(toCellActionContext(context));
  });

  it('should be compatible if isCompatible is undefined', async () => {
    const { action } = getCellAction();
    expect(
      await action.isCompatible({
        ...context,
        metadata: { instanceId: 'test', dataView: dataViewWithTimefieldMock },
      })
    ).toBe(true);
  });

  it('should be compatible if isCompatible returns true', async () => {
    const { action } = getCellAction(() => true);
    expect(
      await action.isCompatible({
        ...context,
        metadata: { instanceId: 'test', dataView: dataViewWithTimefieldMock },
      })
    ).toBe(true);
  });

  it('should not be compatible if isCompatible returns false', async () => {
    const { action } = getCellAction(() => false);
    expect(
      await action.isCompatible({
        ...context,
        metadata: { instanceId: 'test', dataView: dataViewWithTimefieldMock },
      })
    ).toBe(false);
  });

  it('should not be compatible if instanceId is not equal', async () => {
    const { action } = getCellAction();
    expect(
      await action.isCompatible({
        ...context,
        metadata: { instanceId: 'test2', dataView: dataViewWithTimefieldMock },
      })
    ).toBe(false);
  });

  it('should not be compatible if no data', async () => {
    const { action } = getCellAction();
    expect(
      await action.isCompatible({
        ...context,
        data: [],
        metadata: { instanceId: 'test', dataView: dataViewWithTimefieldMock },
      })
    ).toBe(false);
  });

  it("should not be compatible if field doesn't exist in data view", async () => {
    const { action } = getCellAction();
    expect(
      await action.isCompatible({
        ...context,
        data: [
          {
            field: {
              name: '',
              type: '',
              aggregatable: false,
              searchable: false,
            },
          },
        ],
        metadata: { instanceId: 'test', dataView: dataViewWithTimefieldMock },
      })
    ).toBe(false);
  });
});
