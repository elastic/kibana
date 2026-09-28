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
import { TriggerConfigPanel } from './trigger_config_panel';

jest.mock('@kbn/code-editor', () => {
  const MockReact = jest.requireActual('react');
  return {
    CodeEditor: (props: {
      value: string;
      onChange?: (v: string) => void;
      dataTestSubj?: string;
      'aria-label'?: string;
    }) => (
      <textarea
        data-test-subj={props.dataTestSubj ?? 'mocked-code-editor'}
        aria-label={props['aria-label']}
        value={props.value}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    ),
  };
});

jest.mock('@kbn/monaco', () => ({ YAML_LANG_ID: 'yaml' }));
jest.mock('@kbn/workflows-ui', () => ({
  WORKFLOWS_MONACO_EDITOR_THEME: 'theme',
  ensureWorkflowGraphEuiIcons: jest.fn(),
  resolveNodeChipStyle: () => ({
    background: 'bg-accent',
    border: 'border-accent',
    iconColor: 'text-accent',
    isBrand: false,
  }),
}));
jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: ({ iconColor }: { iconColor?: string }) => (
    <span data-test-subj="mocked-step-icon" data-icon-color={iconColor} />
  ),
}));

const renderPanel = (
  overrides: Partial<React.ComponentProps<typeof TriggerConfigPanel>> = {}
) => {
  const onSave = jest.fn();
  const onCancel = jest.fn();
  render(
    <I18nProvider>
      <TriggerConfigPanel
        triggerType="manual"
        triggerLabel="Manual"
        initialFragment="type: manual\n"
        onSave={onSave}
        onCancel={onCancel}
        {...overrides}
      />
    </I18nProvider>
  );
  return { onSave, onCancel };
};

describe('TriggerConfigPanel', () => {
  it('renders Visual builder / YAML tabs and the accent-colored header icon', () => {
    renderPanel();
    expect(screen.getByTestId('workflowTriggerConfigPanelTitle')).toHaveTextContent('Manual');
    expect(screen.getByTestId('workflowTriggerConfigPanelTabs')).toBeInTheDocument();
    expect(screen.getByTestId('workflowTriggerConfigPanelInputs')).toBeInTheDocument();
    expect(screen.getByTestId('workflowTriggerConfigInput-empty')).toBeInTheDocument();
    expect(
      screen.queryByTestId('workflowTriggerConfigPanelAccordion-inputs')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('mocked-step-icon')).toHaveAttribute(
      'data-icon-color',
      'text-accent'
    );
  });

  it('adds a manual input and saves JSON-Schema-shaped inputs', () => {
    const { onSave } = renderPanel();
    fireEvent.click(screen.getByTestId('workflowTriggerConfigInput-add'));
    const nameInput = screen.getByTestId(/workflowTriggerConfigInput-name-/);
    fireEvent.change(nameInput, {
      target: { value: 'environment' },
    });
    fireEvent.click(screen.getByTestId('workflowTriggerConfigPanelSave'));
    expect(onSave).toHaveBeenCalled();
    const fragment = onSave.mock.calls[0][0] as string;
    expect(fragment).toContain('type: manual');
    expect(fragment).toContain('environment');
    expect(fragment).toContain('properties');
    expect(fragment).toContain('string');
  });

  it('does not render an input builder for alert triggers', () => {
    renderPanel({
      triggerType: 'alert',
      triggerLabel: 'Alert',
      initialFragment: 'type: alert\n',
    });
    expect(screen.queryByTestId('workflowTriggerConfigPanelInputs')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowTriggerConfigPanelAlertInfo')).toBeInTheDocument();
  });

  it('edits scheduled interval in Visual builder', () => {
    const { onSave } = renderPanel({
      triggerType: 'scheduled',
      triggerLabel: 'Scheduled',
      initialFragment: 'type: scheduled\nwith:\n  every: 5m\n',
    });
    expect(screen.getByTestId('workflowTriggerConfigPanelEvery')).toHaveValue('5m');
    fireEvent.change(screen.getByTestId('workflowTriggerConfigPanelEvery'), {
      target: { value: '15m' },
    });
    fireEvent.click(screen.getByTestId('workflowTriggerConfigPanelSave'));
    expect(onSave.mock.calls[0][0]).toContain('15m');
  });

  it('round-trips YAML tab edits', () => {
    const { onSave } = renderPanel();
    fireEvent.click(screen.getByTestId('workflowTriggerConfigPanelView-yaml'));
    fireEvent.change(screen.getByTestId('workflowTriggerConfigPanelYaml'), {
      target: {
        value: 'type: manual\ninputs:\n  - name: dry_run\n    type: boolean\n    default: true\n',
      },
    });
    fireEvent.click(screen.getByTestId('workflowTriggerConfigPanelSave'));
    expect(onSave.mock.calls[0][0]).toContain('dry_run');
  });
});
