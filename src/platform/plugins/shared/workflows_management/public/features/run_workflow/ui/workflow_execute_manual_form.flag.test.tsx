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
import { I18nProvider } from '@kbn/i18n-react';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { WorkflowExecuteManualForm } from './workflow_execute_manual_form';

const mockExperimentalFeatures = { enabled: false };
jest.mock('../../../hooks/use_workflows_experimental_ui_setting', () => ({
  useWorkflowsExperimentalUiSetting: () => mockExperimentalFeatures.enabled,
}));

jest.mock('@kbn/code-editor', () => ({
  ...jest.requireActual('@kbn/code-editor'),
  CodeEditor: ({ value, dataTestSubj }: { value: string; dataTestSubj?: string }) => (
    <textarea data-test-subj={dataTestSubj} defaultValue={value} />
  ),
}));

const INPUTS: JsonModelSchemaType = {
  properties: { environment: { type: 'string' } },
};

const renderForm = () =>
  render(
    <WorkflowExecuteManualForm
      value="{}"
      inputs={INPUTS}
      setValue={jest.fn()}
      errors={null}
      setErrors={jest.fn()}
    />,
    { wrapper: I18nProvider }
  );

describe('WorkflowExecuteManualForm and the experimental features setting', () => {
  it('keeps the JSON editor for declared inputs while the setting is off', () => {
    mockExperimentalFeatures.enabled = false;
    renderForm();

    expect(screen.getByTestId('workflow-manual-json-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowExecuteManualFieldsForm')).not.toBeInTheDocument();
  });

  it('shows a field for each declared input once the setting is on', () => {
    mockExperimentalFeatures.enabled = true;
    renderForm();

    expect(screen.getByTestId('workflowExecuteManualFieldsForm')).toBeInTheDocument();
    expect(screen.queryByTestId('workflow-manual-json-editor')).not.toBeInTheDocument();
  });
});
