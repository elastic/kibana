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
import { ExecutionStatus } from '@kbn/workflows';
import { NestedWorkflowExecutionLinks } from './nested_workflow_execution_links';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockStepExecutionDto } from '../../../shared/test_utils';

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: ({
    workflowId,
    executionId,
  }: {
    workflowId: string;
    executionId?: string;
  }) => ({
    href: `/app/workflows/${workflowId}${executionId ? `?executionId=${executionId}` : ''}`,
    navigate: jest.fn(),
  }),
}));

const childExecution = {
  parentStepExecutionId: 'parent-execute',
  workflowId: 'flyout-test-child',
  workflowName: 'Flyout test - child',
  executionId: 'child-exec-1',
  status: ExecutionStatus.COMPLETED,
  stepExecutions: [],
};

describe('NestedWorkflowExecutionLinks', () => {
  const services = createStartServicesMock();
  const renderLinks = (ui: React.ReactElement) =>
    render(ui, { wrapper: getTestProvider({ services }) });

  it('links a workflow.execute step to the child run', () => {
    renderLinks(
      <NestedWorkflowExecutionLinks
        stepExecution={createMockStepExecutionDto({
          id: 'parent-execute',
          stepId: 'run_child',
          stepType: 'workflow.execute',
        })}
        childWorkflowExecution={childExecution}
      />
    );

    const link = screen.getByTestId('workflowExecutionChildRunLink');
    expect(link).toHaveTextContent('workflow.execute: Flyout test - child');
    expect(link).toHaveAttribute(
      'href',
      '/app/workflows/flyout-test-child?executionId=child-exec-1'
    );
  });

  it('links an injected child step to the run that owns it', () => {
    renderLinks(
      <NestedWorkflowExecutionLinks
        stepExecution={createMockStepExecutionDto({
          id: 'child-lookup',
          stepId: 'lookup_host',
          stepType: 'data.set',
        })}
        parentWorkflowExecution={childExecution}
      />
    );

    const link = screen.getByTestId('workflowExecutionOwningRunLink');
    expect(link).toHaveTextContent('Flyout test - child: lookup_host');
    expect(link).toHaveAttribute(
      'href',
      '/app/workflows/flyout-test-child?executionId=child-exec-1'
    );
  });

  it('renders nothing when there is no nested run', () => {
    const { container } = renderLinks(
      <NestedWorkflowExecutionLinks
        stepExecution={createMockStepExecutionDto({ stepType: 'console' })}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
