/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React, { useEffect } from 'react';
import { WorkflowExecutionListFlyout } from './workflow_execution_list_flyout';
import { TestProvider } from '../../../shared/mocks/test_providers';

let listMounts = 0;

jest.mock('./workflow_execution_list_stateful', () => ({
  WorkflowExecutionList: () => {
    useEffect(() => {
      listMounts += 1;
    }, []);
    return <div data-test-subj="workflowExecutionList" />;
  },
}));

describe('WorkflowExecutionListFlyout', () => {
  beforeEach(() => {
    listMounts = 0;
  });

  it('does not move focus to the skip link when the list is hidden', () => {
    const button = document.createElement('button');
    button.textContent = 'Page button';
    const header = document.createElement('header');
    header.className = 'euiHeader';
    header.setAttribute('data-fixed-header', 'true');
    const skip = document.createElement('a');
    skip.href = '#main';
    skip.textContent = 'Skip to main content';
    header.appendChild(skip);
    document.body.append(button, header);
    button.focus();

    const { rerender } = render(
      <WorkflowExecutionListFlyout workflowId="wf-1" onClose={jest.fn()} />,
      { wrapper: TestProvider }
    );

    expect(document.activeElement).toBe(button);
    expect(document.activeElement).not.toBe(skip);
    expect(listMounts).toBe(1);

    rerender(<WorkflowExecutionListFlyout workflowId="wf-1" onClose={jest.fn()} isHidden />);

    expect(document.activeElement).toBe(button);
    expect(document.activeElement).not.toBe(skip);
    expect(screen.getByTestId('workflowExecutionListFlyout')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    expect(screen.getByTestId('workflowExecutionList')).toBeInTheDocument();
    expect(listMounts).toBe(1);

    button.remove();
    header.remove();
  });
});
