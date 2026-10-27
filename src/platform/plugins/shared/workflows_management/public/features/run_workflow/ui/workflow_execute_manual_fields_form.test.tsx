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
import { WorkflowExecuteManualFieldsForm } from './workflow_execute_manual_fields_form';

describe('WorkflowExecuteManualFieldsForm', () => {
  it('flags required inputs without a default and not those with one', () => {
    render(
      <WorkflowExecuteManualFieldsForm
        inputs={
          {
            type: 'object',
            properties: {
              who: { type: 'string', default: 'world' },
              name: { type: 'string' },
              note: { type: 'string' },
            },
            required: ['who', 'name'],
          } as JsonModelSchemaType
        }
        value={{}}
        onChange={jest.fn()}
        fieldErrors={new Map()}
      />,
      { wrapper: I18nProvider }
    );

    expect(screen.getByText('name *')).toBeInTheDocument();
    expect(screen.getByText('who')).toBeInTheDocument();
    expect(screen.queryByText('who *')).not.toBeInTheDocument();
    expect(screen.getByText('note')).toBeInTheDocument();
  });
});
