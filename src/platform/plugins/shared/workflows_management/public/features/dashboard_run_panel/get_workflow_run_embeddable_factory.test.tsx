/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import type { PhaseEvent } from '@kbn/presentation-publishing';
import { WorkflowRunPanel } from './components/workflow_run_panel';
import { getWorkflowRunEmbeddableFactory } from './get_workflow_run_embeddable_factory';
import { openConfigFlyout } from './open_config_flyout';
import type { WorkflowRunEmbeddableState } from '../../../server/dashboard_run_panel/schema';

jest.mock('./open_config_flyout', () => ({ openConfigFlyout: jest.fn() }));
jest.mock('./components/workflow_run_panel', () => ({
  WorkflowRunPanel: jest.fn(() => null),
}));

const initialState: WorkflowRunEmbeddableState = {
  workflow_id: 'wf-1',
  button_label: 'Isolate',
  input_mappings: [{ input: 'host', source: 'constant', value: 'web-1' }],
  graph_layout: 'vertical',
};

const build = async (parentApi: unknown = {}) => {
  const factory = getWorkflowRunEmbeddableFactory(coreMock.createStart(), {
    triggersActionsUi: {} as never,
    workflowsExtensions: {} as never,
  });
  const uuid = 'run-panel';
  return factory.buildEmbeddable({
    uuid,
    parentApi,
    initialState,
    initializeDrilldownsManager: jest.fn(),
    finalizeApi: (apiRegistration) => ({
      ...apiRegistration,
      uuid,
      type: factory.type,
      parentApi,
      phase$: new BehaviorSubject<PhaseEvent | undefined>(undefined),
    }),
  });
};

const lastPanelProps = () => jest.mocked(WorkflowRunPanel).mock.calls.at(-1)?.[0];

describe('getWorkflowRunEmbeddableFactory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('serializes the state it was built with', async () => {
    const { api } = await build();
    expect(api.serializeState()).toEqual(initialState);
  });

  it('applies and serializes the configuration saved from the edit flyout', async () => {
    const { api } = await build();
    await api.onEdit();

    const [{ initialConfig, onSave }] = jest.mocked(openConfigFlyout).mock.calls[0];
    expect(initialConfig).toEqual(initialState);

    const nextConfig = { workflow_id: 'wf-2', input_mappings: [], graph_layout: undefined };
    onSave(nextConfig);
    expect(api.serializeState()).toEqual({ ...nextConfig, button_label: undefined });
  });

  it('is titled after the workflow until a custom title is set', async () => {
    const { api, Component } = await build();
    render(<Component />);
    expect(api.defaultTitle$?.getValue()).toBeUndefined();

    act(() => lastPanelProps()?.onWorkflowNameChange('Isolate host'));
    expect(api.defaultTitle$?.getValue()).toBe('Isolate host');
    expect(api.serializeState().title).toBeUndefined();
  });

  it('reports loading until the panel has loaded its data', async () => {
    const { api, Component } = await build();
    expect(api.dataLoading$.getValue()).toBe(true);
    render(<Component />);

    act(() => lastPanelProps()?.onDataLoadingChange(false));
    expect(api.dataLoading$.getValue()).toBe(false);
  });

  it.each([
    ['edit', true],
    ['view', true],
    ['print', false],
    ['non-interactive', false],
  ] as const)('in %s mode, lets users run the workflow: %s', async (viewMode, isInteractive) => {
    const { Component } = await build({ viewMode$: new BehaviorSubject(viewMode) });
    render(<Component />);
    await waitFor(() => expect(lastPanelProps()?.isInteractive).toBe(isInteractive));
  });

  it('highlights the edited panel while its flyout is open', async () => {
    const { api } = await build();
    await api.onEdit();
    expect(jest.mocked(openConfigFlyout).mock.calls[0][0].focusedPanelId).toBe('run-panel');
  });

  it('holds the graph direction while the dashboard shows an overlay', async () => {
    const hasOverlays$ = new BehaviorSubject(false);
    const { Component } = await build({ hasOverlays$ });
    render(<Component />);
    expect(lastPanelProps()?.holdGraphDirection).toBe(false);

    act(() => hasOverlays$.next(true));
    await waitFor(() => expect(lastPanelProps()?.holdGraphDirection).toBe(true));
  });
});
