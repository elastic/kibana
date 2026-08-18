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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { TemplateBody } from '@kbn/workflows-library';
import { TemplateInstallSection } from './template_install_section';
import { createMockWorkflowApi } from '../../../api/workflows_api.mock';
import { testQueryClientConfig } from '../../../test_utils';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockWorkflowApi = createMockWorkflowApi();
jest.mock('../../../api/use_workflows_api', () => ({
  useWorkflowsApi: () => mockWorkflowApi,
}));

// The connector picker has its own test (it needs the services provider and
// the connectors fetch); a button stub keeps this test self-contained.
jest.mock('./connector_field', () => ({
  ConnectorField: ({
    onChange,
    'data-test-subj': dataTestSubj,
  }: {
    onChange: (id: string) => void;
    'data-test-subj'?: string;
  }) => (
    <button type="button" data-test-subj={dataTestSubj} onClick={() => onChange('connector-1')} />
  ),
}));

const mockUseKibana = useKibana as jest.Mock;

const TEMPLATE: TemplateBody = {
  metadata: {
    slug: 'demo',
    version: '1.0.0',
    availability: '>=9.5.0',
    name: 'Demo Template',
    description: 'Demo.',
    categories: ['utility'],
    install: {
      form: [
        {
          name: 'demo-connector',
          inputType: 'connector',
          connectorType: '.demo',
          required: true,
        },
        { name: 'max-age', inputType: 'number', default: 30 },
      ],
    },
  },
  body: { steps: [] },
  raw: '',
};

const queryClient = new QueryClient(testQueryClientConfig);

describe('TemplateInstallSection', () => {
  let navigateToApp: jest.Mock;
  let addSuccessToast: jest.Mock;
  let onPreviewValuesChange: jest.Mock;

  const setCapabilities = (canCreate: boolean) => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: { workflowsManagement: { createWorkflow: canCreate } },
          navigateToApp,
        },
        notifications: { toasts: { addSuccess: addSuccessToast } },
      },
    });
  };

  const PREVIEW_YAML = 'name: Demo Template\nsteps:\n  - name: demo_step\n    type: demo.run\n';

  const renderSection = (template: TemplateBody = TEMPLATE) =>
    render(
      <QueryClientProvider client={queryClient}>
        <TemplateInstallSection
          template={template}
          onPreviewValuesChange={onPreviewValuesChange}
          previewYaml={PREVIEW_YAML}
        />
      </QueryClientProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    navigateToApp = jest.fn();
    addSuccessToast = jest.fn();
    onPreviewValuesChange = jest.fn();
    setCapabilities(true);
  });

  it('should render the form fields and the Remix with AI action', () => {
    renderSection();

    expect(screen.getByTestId('workflowLibraryInstallForm')).toBeInTheDocument();
    expect(
      screen.getByTestId('workflowLibraryInstallForm-field-demo-connector')
    ).toBeInTheDocument();
    expect(screen.getByTestId('workflowLibraryTemplateRemixButton')).toBeInTheDocument();
  });

  it('should open the editor with the previewed YAML as history state on Remix with AI', () => {
    renderSection();
    const remixButton = screen.getByTestId('workflowLibraryTemplateRemixButton');

    // Not gated on validation: remix is the escape hatch for finishing the
    // configuration in the editor, so it works with required fields missing.
    expect(remixButton).toBeEnabled();
    fireEvent.click(remixButton);

    expect(navigateToApp).toHaveBeenCalledWith('workflows', {
      path: '/create',
      state: { initialYaml: PREVIEW_YAML },
    });
  });

  it('should disable Install while required fields are missing and explain it in a tooltip', async () => {
    renderSection();
    const button = screen.getByTestId('workflowLibraryTemplateInstallButton');

    expect(button).toBeDisabled();

    fireEvent.mouseOver(button.parentElement as HTMLElement);
    expect(
      await screen.findByText('Fill in the required field to install: demo-connector')
    ).toBeInTheDocument();
  });

  it('should report committed values so the preview can refresh', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('workflowLibraryInstallForm-field-demo-connector'));

    expect(onPreviewValuesChange).toHaveBeenCalledWith({
      'demo-connector': 'connector-1',
      'max-age': 30,
    });
  });

  it('should install with the resolved values and navigate to the new workflow', async () => {
    mockWorkflowApi.installTemplate.mockResolvedValue({ workflowId: 'wf-1' });
    renderSection();

    fireEvent.click(screen.getByTestId('workflowLibraryInstallForm-field-demo-connector'));
    const button = screen.getByTestId('workflowLibraryTemplateInstallButton');
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() => expect(navigateToApp).toHaveBeenCalledWith('workflows', { path: '/wf-1' }));
    expect(mockWorkflowApi.installTemplate).toHaveBeenCalledWith('demo', {
      'demo-connector': 'connector-1',
      'max-age': 30,
    });
    expect(addSuccessToast).toHaveBeenCalled();
  });

  it('should surface server field errors inline and show the failure callout', async () => {
    mockWorkflowApi.installTemplate.mockRejectedValue({
      body: {
        message: 'Install form values are invalid',
        attributes: { errors: [{ field: 'demo-connector', reason: 'Expected a connector ID.' }] },
      },
    });
    renderSection();

    fireEvent.click(screen.getByTestId('workflowLibraryInstallForm-field-demo-connector'));
    fireEvent.click(screen.getByTestId('workflowLibraryTemplateInstallButton'));

    expect(await screen.findByTestId('workflowLibraryTemplateInstallError')).toHaveTextContent(
      'Install form values are invalid'
    );
    expect(screen.getByText('Expected a connector ID.')).toBeInTheDocument();
  });

  it('should render only the actions block for templates without an install form', () => {
    renderSection({
      ...TEMPLATE,
      metadata: { ...TEMPLATE.metadata, install: undefined },
    });

    expect(screen.queryByTestId('workflowLibraryInstallForm')).toBeNull();
    expect(screen.getByTestId('workflowLibraryTemplateInstallButton')).toBeEnabled();
  });

  it('should render nothing without the create-workflow privilege', () => {
    setCapabilities(false);
    renderSection();

    expect(screen.queryByTestId('workflowLibraryTemplateInstallActions')).toBeNull();
    expect(screen.queryByTestId('workflowLibraryTemplateRemixButton')).toBeNull();
  });
});
