/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { InstallFormField } from '@kbn/workflows-library';
import { TemplateRequirements } from './template_requirements';
import { WorkflowsUiServicesProvider } from '../../../context';
import { createMockWorkflowsUiServices } from '../../../context/__mocks__/mocks';

const FIELDS: InstallFormField[] = [
  { name: 'slack-connector', inputType: 'connector', connectorType: '.slack', required: true },
  { name: 'max-age', inputType: 'number', label: 'Lookback window (days)' },
  { name: 'target-index', inputType: 'esIndex' },
];

describe('TemplateRequirements', () => {
  let services: ReturnType<typeof createMockWorkflowsUiServices>;

  const renderRequirements = (fields: InstallFormField[] = FIELDS) =>
    render(
      <WorkflowsUiServicesProvider services={services}>
        <TemplateRequirements fields={fields} />
      </WorkflowsUiServicesProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    services = createMockWorkflowsUiServices();
  });

  it('should render one row per install-form field', () => {
    renderRequirements();

    expect(screen.getByTestId('workflowLibraryTemplateRequirements')).toBeInTheDocument();
    expect(
      screen.getByTestId('workflowLibraryTemplateRequirements-requirement-slack-connector')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('workflowLibraryTemplateRequirements-requirement-max-age')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('workflowLibraryTemplateRequirements-requirement-target-index')
    ).toBeInTheDocument();
  });

  it('should label a connector field with the registered action type title', () => {
    services.triggersActionsUi.actionTypeRegistry.register({
      id: '.slack',
      actionTypeTitle: 'Slack messaging',
    } as unknown as ActionTypeModel);

    renderRequirements();

    expect(
      screen.getByTestId('workflowLibraryTemplateRequirements-requirement-slack-connector')
    ).toHaveTextContent('Slack messaging');
  });

  it('should fall back to the capitalized connector type when it is not registered', () => {
    renderRequirements();

    expect(
      screen.getByTestId('workflowLibraryTemplateRequirements-requirement-slack-connector')
    ).toHaveTextContent('Slack');
  });

  it('should label other fields with their label, falling back to the field name', () => {
    renderRequirements();

    expect(
      screen.getByTestId('workflowLibraryTemplateRequirements-requirement-max-age')
    ).toHaveTextContent('Lookback window (days)');
    expect(
      screen.getByTestId('workflowLibraryTemplateRequirements-requirement-target-index')
    ).toHaveTextContent('target-index');
  });

  it('should render nothing without fields', () => {
    renderRequirements([]);

    expect(screen.queryByTestId('workflowLibraryTemplateRequirements')).toBeNull();
  });
});
