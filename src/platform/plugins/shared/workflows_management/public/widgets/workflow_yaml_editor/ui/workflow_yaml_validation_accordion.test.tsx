/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@emotion/jest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TestProvider } from '../../../shared/mocks/test_providers';
import type { YamlValidationResult } from '../../../features/validate_workflow_yaml/model/types';
import { WorkflowYamlValidationAccordion } from './workflow_yaml_validation_accordion';

const validationErrors: YamlValidationResult[] = [
  {
    id: 'error-1',
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 10,
    hoverMessage: null,
    severity: 'error',
    message: 'Unexpected token',
    owner: 'yaml',
  },
];

describe('WorkflowYamlValidationAccordion', () => {
  it('renders validation errors as user-selectable text', () => {
    render(
      <WorkflowYamlValidationAccordion
        isMounted={true}
        isLoading={false}
        error={null}
        validationErrors={validationErrors}
      />,
      { wrapper: TestProvider }
    );

    const errorButton = screen.getByText('Unexpected token').closest('button');
    expect(errorButton).toHaveStyleRule('user-select', 'text');
  });
});
