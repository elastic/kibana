/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { WorkflowDetailDto } from '@kbn/workflows';
import type { ConfigFlyoutProps } from './config_flyout';
import { ConfigFlyout } from './config_flyout';
import { useWorkflowDetail } from '../hooks/use_workflow_run_panel_queries';

jest.mock('../hooks/use_workflow_run_panel_queries', () => ({
  useWorkflowDetail: jest.fn(),
}));

jest.mock('@kbn/workflows-ui', () => ({
  WorkflowSelector: ({ onWorkflowChange }: { onWorkflowChange: (id: string) => void }) => (
    <button
      type="button"
      data-test-subj="pickOtherWorkflow"
      onClick={() => onWorkflowChange('other')}
    />
  ),
}));

const useWorkflowDetailMock = useWorkflowDetail as jest.MockedFunction<typeof useWorkflowDetail>;

type WorkflowQuery = ReturnType<typeof useWorkflowDetail>;

const loaded = (workflow: Partial<WorkflowDetailDto>): WorkflowQuery =>
  ({ data: workflow, isLoading: false, isError: false } as WorkflowQuery);

const failed = { data: undefined, isLoading: false, isError: true } as WorkflowQuery;

const workflow: Partial<WorkflowDetailDto> = {
  id: 'wf',
  name: 'Isolate host',
  definition: {
    version: '1',
    name: 'Isolate host',
    enabled: true,
    steps: [],
    triggers: [
      {
        type: 'manual',
        inputs: {
          properties: {
            window: { $ref: '#/kibana/definitions/dashboardTimeRange' },
            host: { type: 'string' },
          },
          required: ['window'],
        },
      },
    ],
  },
};

const savedConfig: ConfigFlyoutProps['initialConfig'] = {
  workflow_id: 'wf',
  input_mappings: [{ input: 'host', source: 'constant', value: 'web-1' }],
  graph_layout: 'vertical',
};

const renderFlyout = (initialConfig?: ConfigFlyoutProps['initialConfig']) => {
  const onSave = jest.fn();
  render(
    <ConfigFlyout
      ariaLabelledBy="title"
      controls={[]}
      initialConfig={initialConfig}
      onSave={onSave}
      onCancel={jest.fn()}
    />,
    { wrapper: I18nProvider }
  );
  return onSave;
};

describe('ConfigFlyout', () => {
  beforeEach(() => {
    useWorkflowDetailMock.mockImplementation((workflowId) =>
      workflowId === 'wf' ? loaded(workflow) : failed
    );
  });

  it('saves the default mapping of each input and leaves an auto layout unset', () => {
    const onSave = renderFlyout({ workflow_id: 'wf' });
    fireEvent.click(screen.getByTestId('workflowRunPanelSave'));
    expect(onSave).toHaveBeenCalledWith({
      workflow_id: 'wf',
      button_label: undefined,
      input_mappings: [{ input: 'window', source: 'time_range' }],
      graph_layout: undefined,
    });
  });

  it('keeps the saved mappings when the workflow fails to load', () => {
    useWorkflowDetailMock.mockReturnValue(failed);
    const onSave = renderFlyout(savedConfig);
    expect(screen.getByTestId('workflowRunPanelConfigLoadFailed')).toHaveTextContent(
      'Its input mappings are kept as they are when you save.'
    );
    fireEvent.click(screen.getByTestId('workflowRunPanelSave'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        input_mappings: savedConfig?.input_mappings,
        graph_layout: 'vertical',
      })
    );
  });

  it('drops the saved mappings when switching to a workflow that fails to load', () => {
    const onSave = renderFlyout(savedConfig);
    fireEvent.click(screen.getByTestId('pickOtherWorkflow'));
    expect(screen.getByTestId('workflowRunPanelConfigLoadFailed')).not.toHaveTextContent('kept');
    fireEvent.click(screen.getByTestId('workflowRunPanelSave'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ workflow_id: 'other', input_mappings: [] })
    );
  });
});
