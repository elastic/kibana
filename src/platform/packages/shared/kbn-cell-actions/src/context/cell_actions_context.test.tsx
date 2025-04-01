/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { makeAction, makeActionContext } from '../mocks/helpers';
import { CellActionsProvider, useCellActionsContext } from './cell_actions_context';

const action = makeAction('action-1', 'icon', 1);
const mockGetTriggerCompatibleActions = jest.fn(async () => [action]);
const ContextWrapper: React.FC<PropsWithChildren<unknown>> = ({ children }) => (
  <CellActionsProvider getTriggerCompatibleActions={mockGetTriggerCompatibleActions}>
    {children}
  </CellActionsProvider>
);

describe('CellActionContext', () => {
  const triggerId = 'triggerId';
  const actionContext = makeActionContext();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error when context not found', () => {
    expect(() => renderHook(useCellActionsContext)).toThrow(
      /No CellActionsContext found. Please wrap the application with CellActionsProvider/
    );
  });

  it('should call getTriggerCompatibleActions and return actions', async () => {
    const { result } = renderHook(useCellActionsContext, { wrapper: ContextWrapper });
    const actions = await result.current.getActions(actionContext);

    expect(mockGetTriggerCompatibleActions).toHaveBeenCalledWith(triggerId, actionContext);
    expect(actions).toEqual([action]);
  });

  it('should sort actions by order', async () => {
    const firstAction = makeAction('action-1', 'icon', 1);
    const secondAction = makeAction('action-2', 'icon', 2);
    mockGetTriggerCompatibleActions.mockResolvedValueOnce([secondAction, firstAction]);

    const { result } = renderHook(useCellActionsContext, { wrapper: ContextWrapper });
    const actions = await result.current.getActions(actionContext);

    expect(actions).toEqual([firstAction, secondAction]);
  });

  it('should sort actions by id when order is undefined', async () => {
    const firstAction = makeAction('action-1');
    const secondAction = makeAction('action-2');

    mockGetTriggerCompatibleActions.mockResolvedValueOnce([secondAction, firstAction]);

    const { result } = renderHook(useCellActionsContext, { wrapper: ContextWrapper });
    const actions = await result.current.getActions(actionContext);

    expect(actions).toEqual([firstAction, secondAction]);
  });

  it('should sort actions by id and order', async () => {
    const actionWithoutOrder = makeAction('action-1-no-order');
    const secondAction = makeAction('action-2', 'icon', 2);
    const thirdAction = makeAction('action-3', 'icon', 3);

    mockGetTriggerCompatibleActions.mockResolvedValueOnce([
      thirdAction,
      secondAction,
      actionWithoutOrder,
    ]);

    const { result } = renderHook(useCellActionsContext, { wrapper: ContextWrapper });
    const actions = await result.current.getActions(actionContext);

    expect(actions).toEqual([secondAction, thirdAction, actionWithoutOrder]);
  });
});
