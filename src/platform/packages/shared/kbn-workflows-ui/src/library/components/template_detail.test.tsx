/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import type { TemplateBody } from '@kbn/workflows-library';
import { TemplateDetail } from './template_detail';
import { WorkflowsUiServicesProvider } from '../../context';
import { createMockWorkflowsUiServices } from '../../context/__mocks__/mocks';

const mockUseTemplate = jest.fn();
jest.mock('../hooks/use_template', () => ({
  useTemplate: (slug: string) => mockUseTemplate(slug),
}));

jest.mock('../../components', () => {
  const actual = jest.requireActual('../../components');

  return {
    ...actual,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TypeIcon: () => <span data-test-subj="mockTypeIcon" />,
    WorkflowDetailBottomBar: () => <div data-test-subj="mockWorkflowDetailBottomBar" />,
    WorkflowVisualEditorFlyout: ({
      target,
      onOpenInYaml,
      onRunStep,
      renderMoreMenuItems,
    }: {
      target: { yamlSnippet?: string };
      onOpenInYaml?: () => void;
      onRunStep?: () => void;
      renderMoreMenuItems?: () => JSX.Element[];
    }) => (
      <div data-test-subj="workflowVisualEditorFlyout">
        {target.yamlSnippet}
        {onRunStep ? (
          <button type="button" data-test-subj="workflowVisualEditorFlyoutRunStep" />
        ) : null}
        {renderMoreMenuItems ? (
          <button type="button" data-test-subj="workflowVisualEditorFlyoutMore" />
        ) : null}
        {onOpenInYaml ? (
          <button
            type="button"
            data-test-subj="workflowVisualEditorFlyoutOpenInYaml"
            onClick={onOpenInYaml}
          />
        ) : null}
      </div>
    ),
    WorkflowGraphCanvasWithoutProvider: ({
      onStepSelect,
      transformed,
    }: {
      transformed: { nodeRefs: Record<string, { kind: string }> };
      onStepSelect: (stepId: string) => void;
    }) => {
      const stepNodeId = Object.entries(transformed.nodeRefs).find(
        ([, ref]) => ref.kind === 'step'
      )?.[0];

      return (
        <button
          type="button"
          data-test-subj="mockWorkflowGraphCanvas"
          onClick={() => {
            if (stepNodeId) {
              onStepSelect(stepNodeId);
            }
          }}
        >
          {'Select step'}
        </button>
      );
    },
  };
});

// Stub the Monaco-backed preview so the test does not depend on the editor.
jest.mock('./template_yaml_preview', () => ({
  WorkflowYamlPreview: ({ yaml, 'data-test-subj': dataTestSubj }: any) => (
    <pre data-test-subj={dataTestSubj}>{yaml}</pre>
  ),
}));

const RAW = `template-metadata:
  slug: my-template
  version: "1.2.0"
  name: "My Template"
  description: "Does useful things."
  solutions: [security]
  categories: [threat-intel, enrichment]
  install:
    form:
      - name: max-age
        inputType: number
        default: 7
triggers:
  - type: manual
steps:
  - name: notify
    type: slack.sendMessage
    with:
      maxAge: __install__.max-age
`;

const TEMPLATE_BODY: TemplateBody = {
  metadata: {
    slug: 'my-template',
    version: '1.2.0',
    availability: '>=9.5.0',
    name: 'My Template',
    description: 'Does useful things.',
    solutions: ['security'],
    categories: ['threat-intel', 'enrichment'],
    install: { form: [{ name: 'max-age', inputType: 'number', default: 7 }] },
  },
  body: {
    triggers: [{ type: 'manual', inputs: [{ name: 'max-age', type: 'number' }] }],
    steps: [{ name: 'notify', type: 'slack.sendMessage', with: { maxAge: '__install__.max-age' } }],
  },
  raw: RAW,
};

const renderDetail = () =>
  render(
    <WorkflowsUiServicesProvider services={createMockWorkflowsUiServices()}>
      <TemplateDetail slug="my-template" />
    </WorkflowsUiServicesProvider>
  );

const renderGraphDetail = () =>
  render(
    <WorkflowsUiServicesProvider services={createMockWorkflowsUiServices()}>
      <TemplateDetail slug="my-template" showGraphPreview={true} />
    </WorkflowsUiServicesProvider>
  );

describe('TemplateDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTemplate.mockReturnValue({ data: TEMPLATE_BODY, isLoading: false, isError: false });
  });

  it('should render the name, description and version', () => {
    renderDetail();
    expect(screen.getByRole('heading', { name: 'My Template' })).toBeInTheDocument();
    expect(screen.getByText('Does useful things.')).toBeInTheDocument();
    expect(screen.getByTestId('workflowLibraryTemplateDetail-version')).toHaveTextContent('1.2.0');
  });

  it('should render the solution logo and humanized tag badges under the title', () => {
    renderDetail();
    expect(screen.getByText('Solutions')).toBeInTheDocument();
    // Solutions render as product logos (name shown on hover), not text.
    expect(
      screen.getByTestId('workflowLibraryTemplateDetail-solution-security')
    ).toBeInTheDocument();
    // Categories render as tags under the title (humanized).
    const tags = screen.getByTestId('workflowLibraryTemplateDetail-tags');
    expect(within(tags).getByText('Threat Intel')).toBeInTheDocument();
    expect(within(tags).getByText('Enrichment')).toBeInTheDocument();
  });

  it('should call onLoaded with the loaded template', () => {
    const onLoaded = jest.fn();
    render(
      <WorkflowsUiServicesProvider services={createMockWorkflowsUiServices()}>
        <TemplateDetail slug="my-template" onLoaded={onLoaded} />
      </WorkflowsUiServicesProvider>
    );
    expect(onLoaded).toHaveBeenCalledWith(TEMPLATE_BODY);
  });

  it('should pass rendered YAML (metadata stripped, install default applied) to the preview', () => {
    renderDetail();
    const preview = screen.getByTestId('workflowLibraryTemplateDetail-preview');
    expect(preview).not.toHaveTextContent('template-metadata');
    expect(preview.textContent).toContain('maxAge: 7');
    expect(preview.textContent).not.toContain('__install__');
  });

  it('should show the selected step YAML in a read-only graph flyover', () => {
    renderGraphDetail();

    fireEvent.click(screen.getByTestId('mockWorkflowGraphCanvas'));

    expect(screen.getByTestId('workflowLibraryTemplateDetailGraphFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('workflowVisualEditorFlyout')).toHaveTextContent('name: notify');
    expect(screen.getByTestId('workflowVisualEditorFlyout')).toHaveTextContent(
      'type: slack.sendMessage'
    );
    expect(screen.queryByTestId('workflowVisualEditorFlyoutRunStep')).toBeNull();
    expect(screen.queryByTestId('workflowVisualEditorFlyoutMore')).toBeNull();
    fireEvent.click(screen.getByTestId('workflowVisualEditorFlyoutOpenInYaml'));

    expect(screen.getByTestId('workflowLibraryTemplateDetail-preview')).toBeInTheDocument();
  });

  it('should render a loading spinner while loading', () => {
    mockUseTemplate.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderDetail();
    expect(screen.getByTestId('workflowLibraryTemplateDetail-loading')).toBeInTheDocument();
  });

  it('should render an error callout on failure', () => {
    mockUseTemplate.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderDetail();
    expect(screen.getByTestId('workflowLibraryTemplateDetail-error')).toBeInTheDocument();
  });
});
