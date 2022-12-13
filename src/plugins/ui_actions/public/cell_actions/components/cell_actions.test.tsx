/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, render } from '@testing-library/react';
import React from 'react';
import { CellActions, CellActionsMode } from './cell_actions';
import { makeAction } from '../mocks/helpers';
import { CellActionsContextProvider } from './cell_actions_context';

const TRIGGER_ID = 'test-trigger-id';
const CONFIG = { field: 'name', value: '123', fieldType: 'text' };

describe('CellActions', () => {
  it('renders', async () => {
    const getActionsPromise = Promise.resolve([]);
    const getActions = () => getActionsPromise;

    const { queryByTestId } = render(
      <CellActionsContextProvider getCompatibleActions={getActions}>
        <CellActions mode={CellActionsMode.ALWAYS_VISIBLE} triggerId={TRIGGER_ID} config={CONFIG}>
          Field value
        </CellActions>
      </CellActionsContextProvider>
    );

    await act(async () => {
      await getActionsPromise;
    });

    expect(queryByTestId('cellActions')).toBeInTheDocument();
  });

  it('renders InlineActions when mode is ALWAYS_VISIBLE', async () => {
    const getActionsPromise = Promise.resolve([]);
    const getActions = () => getActionsPromise;

    const { queryByTestId } = render(
      <CellActionsContextProvider getCompatibleActions={getActions}>
        <CellActions mode={CellActionsMode.ALWAYS_VISIBLE} triggerId={TRIGGER_ID} config={CONFIG}>
          Field value
        </CellActions>
      </CellActionsContextProvider>
    );

    await act(async () => {
      await getActionsPromise;
    });

    expect(queryByTestId('inlineActions')).toBeInTheDocument();
  });

  it('renders HoverActionsPopover when mode is HOVER_POPOVER', async () => {
    const getActionsPromise = Promise.resolve([]);
    const getActions = () => getActionsPromise;

    const { queryByTestId } = render(
      <CellActionsContextProvider getCompatibleActions={getActions}>
        <CellActions mode={CellActionsMode.HOVER_POPOVER} triggerId={TRIGGER_ID} config={CONFIG}>
          Field value
        </CellActions>
      </CellActionsContextProvider>
    );

    await act(async () => {
      await getActionsPromise;
    });

    expect(queryByTestId('hoverActionsPopover')).toBeInTheDocument();
  });

  it('sorts actions', async () => {
    const getActionsPromise = Promise.resolve([
      makeAction('action-2', 'icon', 2),
      makeAction('action-1', 'icon', 1),
    ]);
    const getActions = () => getActionsPromise;

    const { getAllByRole } = render(
      <CellActionsContextProvider getCompatibleActions={getActions}>
        <CellActions mode={CellActionsMode.ALWAYS_VISIBLE} triggerId={TRIGGER_ID} config={CONFIG}>
          Field value
        </CellActions>
      </CellActionsContextProvider>
    );

    await act(async () => {
      await getActionsPromise;
    });

    expect(getAllByRole('button').map((e) => e.getAttribute('aria-label'))).toEqual([
      'action-1',
      'action-2',
    ]);
  });
});
