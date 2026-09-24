/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { WorkflowCreationPanel } from './workflow_creation_panel';

const mockGetTemplate = jest.fn();
const mockRenderTemplate = jest.fn(({ template }: { template: { raw: string } }) => template.raw);

jest.mock('@kbn/workflows-library', () => ({
  ...jest.requireActual('@kbn/workflows-library'),
  renderTemplate: (input: { template: { raw: string } }) => mockRenderTemplate(input),
}));

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useLibraryEnabled: () => true,
  useWorkflowsApi: () => ({ getTemplate: mockGetTemplate }),
  useRecommendedTemplates: () => ({
    recommendations: [
      {
        template: {
          slug: 'alert-triage',
          version: '1.0.0',
          availability: '>=9.5.0',
          name: 'Alert triage',
          description: 'Enrich alerts',
          categories: ['enrichment'],
          solutions: ['security'],
          definitionUrl: 'templates/alert-triage/1.0.0.yaml',
          contentHash: `sha256:${'a'.repeat(64)}`,
          stepTypes: ['elasticsearch.search'],
          triggerTypes: ['alert'],
        },
        reason: {
          signal: 'solution',
          label: 'Popular in Security',
          tooltip: 'Based on your current solution — Security',
        },
      },
    ],
    isLoading: false,
    isError: false,
  }),
  RecommendedTemplateCard: ({
    template,
    reason,
    onSelect,
    'data-test-subj': dataTestSubj,
  }: {
    template: { slug: string; name: string };
    reason: { label: string };
    onSelect: (t: { slug: string; name: string }) => void;
    'data-test-subj'?: string;
  }) => (
    <button type="button" data-test-subj={dataTestSubj} onClick={() => onSelect(template)}>
      {template.name}
      <span data-test-subj={`${dataTestSubj}-reason`}>{reason.label}</span>
    </button>
  ),
  TemplateDetail: ({
    slug,
    backButton,
    onApplyToWorkflow,
  }: {
    slug: string;
    backButton?: React.ReactNode;
    onApplyToWorkflow?: (yaml: string) => void;
  }) => (
    <div data-test-subj="mockTemplateDetail">
      <span data-test-subj="mockTemplateDetailSlug">{slug}</span>
      {backButton}
      {onApplyToWorkflow ? (
        <button
          type="button"
          data-test-subj="mockTemplateDetailApply"
          onClick={() => onApplyToWorkflow('name: From detail\n')}
        >
          Apply
        </button>
      ) : null}
    </div>
  ),
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: () =>
          '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors',
      },
      notifications: {
        toasts: {
          addDanger: jest.fn(),
        },
      },
    },
  }),
}));

jest.mock('../../../hooks/use_workflows_experimental_ui_setting', () => ({
  useWorkflowsExperimentalUiSetting: () => false,
}));

jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: () => <span data-test-subj="mockStepIcon" />,
}));

const TEMPLATE_WITH_SETUP = {
  metadata: {
    slug: 'alert-triage',
    version: '1.0.0',
    availability: '>=9.5.0',
    name: 'Alert triage',
    description: 'Enrich alerts',
    categories: ['enrichment'],
    install: {
      form: [{ name: 'enable-remediation', inputType: 'boolean', default: false }],
    },
  },
  body: { steps: [] },
  raw: 'name: Alert triage\nsteps: []\n',
};

const TEMPLATE_WITHOUT_SETUP = {
  ...TEMPLATE_WITH_SETUP,
  metadata: {
    ...TEMPLATE_WITH_SETUP.metadata,
    install: undefined,
  },
  raw: 'name: Alert triage\nsteps:\n  - name: search\n    type: elasticsearch.search\n',
};

const renderPanel = (overrides: Partial<React.ComponentProps<typeof WorkflowCreationPanel>> = {}) =>
  render(
    <I18nProvider>
      <WorkflowCreationPanel
        isAiAvailable
        onGenerateWithAi={jest.fn()}
        onPickTrigger={jest.fn()}
        onPickAction={jest.fn()}
        onBrowseTemplates={jest.fn()}
        onApplyTemplateYaml={jest.fn()}
        {...overrides}
      />
    </I18nProvider>
  );

describe('WorkflowCreationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTemplate.mockResolvedValue(TEMPLATE_WITH_SETUP);
  });

  it('picks a trigger', () => {
    const onPickTrigger = jest.fn();
    renderPanel({ onPickTrigger });
    expect(screen.getByTestId('workflowCreationPanelTriggers')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('workflowCreationPanelTrigger-manual'));
    expect(onPickTrigger).toHaveBeenCalledWith('manual');
  });

  it('generates with AI from the prompt', () => {
    const onGenerateWithAi = jest.fn();
    renderPanel({ onGenerateWithAi });
    expect(screen.getByTestId('workflowCreationPanelAiGo')).toBeDisabled();
    fireEvent.change(screen.getByTestId('workflowCreationPanelAiInput'), {
      target: { value: 'Notify Slack on high severity' },
    });
    expect(screen.getByTestId('workflowCreationPanelAiGo')).toBeEnabled();
    fireEvent.click(screen.getByTestId('workflowCreationPanelAiGo'));
    expect(onGenerateWithAi).toHaveBeenCalledWith('Notify Slack on high severity');
  });

  it('opens the actions picker', () => {
    const onPickAction = jest.fn();
    renderPanel({ onPickAction });
    fireEvent.click(screen.getByTestId('workflowCreationPanelPickAction'));
    expect(onPickAction).toHaveBeenCalled();
  });

  it('shows the start heading when AI is unavailable', () => {
    renderPanel({ isAiAvailable: false });
    expect(screen.getByText('How should this workflow start?')).toBeInTheDocument();
    expect(screen.getByTestId('workflowCreationPanelAiNudge')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowCreationPanelAiNudgeDismiss')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowCreationPanelAiNudgeConnectLlm')).toHaveAttribute(
      'href',
      '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors'
    );
  });

  it('toggles prototype LLM states', () => {
    renderPanel({ isAiAvailable: true });
    expect(screen.getByTestId('workflowCreationPanelAiInput')).toBeInTheDocument();

    fireEvent.click(screen.getByText('LLM missing'));
    expect(screen.getByTestId('workflowCreationPanelAiNudge')).toBeInTheDocument();
    expect(screen.getByTestId('workflowCreationPanelAiNudgeConnectLlm')).toBeInTheDocument();

    fireEvent.click(screen.getByText('On-prem'));
    expect(screen.getByTestId('workflowCreationPanelAiNudgeOnPrem')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowCreationPanelAiNudgeConnectLlm')).not.toBeInTheDocument();
    expect(
      screen.getByText(/configure an on-premises LLM connector to enable/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('LLM connected'));
    expect(screen.getByTestId('workflowCreationPanelAiInput')).toBeInTheDocument();
  });

  it('renders recommended templates with reason metadata', () => {
    renderPanel();
    expect(screen.getByTestId('workflowCreationPanelTemplates')).toBeInTheDocument();
    expect(screen.getByTestId('workflowCreationPanelTemplate-alert-triage')).toBeInTheDocument();
    expect(
      screen.getByTestId('workflowCreationPanelTemplate-alert-triage-reason')
    ).toHaveTextContent('Popular in Security');
    expect(screen.getByTestId('workflowCreationPanelBrowseTemplates')).toBeInTheDocument();
  });

  it('opens template detail when the template has Setup fields', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('workflowCreationPanelTemplate-alert-triage'));

    expect(await screen.findByTestId('workflowCreationPanelTemplateDetail')).toBeInTheDocument();
    expect(screen.getByTestId('mockTemplateDetailSlug')).toHaveTextContent('alert-triage');
    expect(screen.queryByTestId('workflowCreationPanelTemplates')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowCreationPanelTemplateDetailBack'));
    expect(screen.getByTestId('workflowCreationPanelTemplates')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowCreationPanelTemplateDetail')).not.toBeInTheDocument();
  });

  it('applies template YAML from detail and closes the pane', async () => {
    const onApplyTemplateYaml = jest.fn();
    renderPanel({ onApplyTemplateYaml });
    fireEvent.click(screen.getByTestId('workflowCreationPanelTemplate-alert-triage'));

    expect(await screen.findByTestId('mockTemplateDetailApply')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mockTemplateDetailApply'));

    expect(onApplyTemplateYaml).toHaveBeenCalledWith('name: From detail\n');
    expect(screen.queryByTestId('workflowCreationPanelTemplateDetail')).not.toBeInTheDocument();
  });

  it('skips the detail pane and applies YAML when there are no Setup fields', async () => {
    mockGetTemplate.mockResolvedValue(TEMPLATE_WITHOUT_SETUP);
    const onApplyTemplateYaml = jest.fn();
    renderPanel({ onApplyTemplateYaml });

    fireEvent.click(screen.getByTestId('workflowCreationPanelTemplate-alert-triage'));

    await waitFor(() => {
      expect(onApplyTemplateYaml).toHaveBeenCalledWith(TEMPLATE_WITHOUT_SETUP.raw);
    });
    expect(mockRenderTemplate).toHaveBeenCalled();
    expect(screen.queryByTestId('workflowCreationPanelTemplateDetail')).not.toBeInTheDocument();
  });
});
