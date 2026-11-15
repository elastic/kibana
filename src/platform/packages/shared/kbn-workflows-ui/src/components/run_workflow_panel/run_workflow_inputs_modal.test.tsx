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
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { RunWorkflowInputsModal } from './run_workflow_inputs_modal';

jest.mock('@kbn/code-editor', () => ({
  ...jest.requireActual('@kbn/code-editor'),
  CodeEditor: ({ value }: { value: string }) => <pre data-test-subj="editorValue">{value}</pre>,
}));

const inputs: JsonModelSchemaType = {
  properties: {
    host: { type: 'string' },
    limit: { type: 'integer', default: 5 },
  },
  required: ['host'],
};

const getEditorJson = (): Record<string, unknown> =>
  JSON.parse(screen.getByTestId('editorValue').textContent ?? '{}');

describe('RunWorkflowInputsModal', () => {
  it('prefills the editor with initial values over the generated sample', () => {
    render(
      <RunWorkflowInputsModal
        workflowName="Isolate host"
        inputs={inputs}
        initialValues={{ host: 'web-1' }}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
      { wrapper: I18nProvider }
    );
    const json = getEditorJson();
    expect(json.host).toBe('web-1');
    expect(json).toHaveProperty('limit');
  });

  describe('with an input that references a built-in definition', () => {
    const refInputs: JsonModelSchemaType = {
      properties: { window: { $ref: '#/kibana/definitions/dashboardTimeRange' } },
      required: ['window'],
    };

    it('samples the referenced shape and validates it like the server', () => {
      render(
        <RunWorkflowInputsModal
          workflowName="Investigate"
          inputs={refInputs}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
        />,
        { wrapper: I18nProvider }
      );
      expect(getEditorJson().window).toEqual(
        expect.objectContaining({ from: expect.any(String), to: expect.any(String) })
      );
      expect(screen.getByTestId('workflowSubmitResume')).toBeDisabled();
    });

    it('submits valid prefilled values', () => {
      const onSubmit = jest.fn();
      const window = { from: '2026-11-15T10:00:00.000Z', to: '2026-11-15T11:00:00.000Z' };
      render(
        <RunWorkflowInputsModal
          workflowName="Investigate"
          inputs={refInputs}
          initialValues={{ window }}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />,
        { wrapper: I18nProvider }
      );
      fireEvent.click(screen.getByTestId('workflowSubmitResume'));
      expect(onSubmit).toHaveBeenCalledWith({ window });
    });
  });

  it('renders the notice above the editor', () => {
    render(
      <RunWorkflowInputsModal
        workflowName="Isolate host"
        inputs={inputs}
        notice={<span>{'Host could not be read from the dashboard'}</span>}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
      { wrapper: I18nProvider }
    );
    expect(screen.getByTestId('workflowResumeExecutionModalNotice')).toHaveTextContent(
      'Host could not be read from the dashboard'
    );
  });
});
