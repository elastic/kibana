/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, render } from '@testing-library/react';
import React from 'react';
import { CellActionExecutionContext } from './cell_actions';
import { makeAction } from '../mocks/helpers';
import { InlineActions } from './inline_actions';
import { CellActionsContextProvider } from '.';

describe('InlineActions', () => {
  const actionContext = { trigger: { id: 'triggerId' } } as CellActionExecutionContext;
  it('renders', async () => {
    const getActionsPromise = Promise.resolve([]);
    const getActions = () => getActionsPromise;
    const { queryByTestId } = render(
      <CellActionsContextProvider getTriggerCompatibleActions={getActions}>
        <InlineActions
          visibleCellActions={5}
          actionContext={actionContext}
          showActionTooltips={false}
        />
      </CellActionsContextProvider>
    );

    await act(async () => {
      await getActionsPromise;
    });

    expect(queryByTestId('inlineActions')).toBeInTheDocument();
  });

  it('renders all actions', async () => {
    const getActionsPromise = Promise.resolve([
      makeAction('action-1'),
      makeAction('action-2'),
      makeAction('action-3'),
      makeAction('action-4'),
      makeAction('action-5'),
    ]);
    const getActions = () => getActionsPromise;
    const { queryAllByRole } = render(
      <CellActionsContextProvider getTriggerCompatibleActions={getActions}>
        <InlineActions
          visibleCellActions={5}
          actionContext={actionContext}
          showActionTooltips={false}
        />
      </CellActionsContextProvider>
    );

    await act(async () => {
      await getActionsPromise;
    });

    expect(queryAllByRole('button').length).toBe(5);
  });
});
