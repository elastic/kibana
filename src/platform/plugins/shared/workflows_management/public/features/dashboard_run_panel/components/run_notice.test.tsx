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
import { RunNotice } from './run_notice';
import type { WorkflowInputDescriptor } from '../lib/describe_workflow_inputs';

const descriptors: WorkflowInputDescriptor[] = [
  { name: 'window', label: 'Time window', kind: 'time_range', required: true },
  { name: 'host', label: 'Host', kind: 'string', required: true },
  { name: 'limit', label: 'Limit', kind: 'number', required: true, defaultValue: 5 },
  { name: 'note', label: 'Note', kind: 'string', required: false },
];

describe('RunNotice', () => {
  it('names the prefilled inputs and the required inputs left to fill in', () => {
    render(
      <RunNotice
        descriptors={descriptors}
        resolved={{ values: { window: { from: 'a', to: 'b' } }, issues: [] }}
      />,
      { wrapper: I18nProvider }
    );
    expect(screen.getByTestId('workflowRunPanelPrefilled')).toHaveTextContent(
      'Prefilled from the dashboard: Time window.'
    );
    expect(screen.getByTestId('workflowRunPanelToFill')).toHaveTextContent(
      'Fill in before running: Host.'
    );
    expect(screen.queryByTestId('workflowRunPanelResolutionIssues')).not.toBeInTheDocument();
  });

  it('lists the inputs the dashboard could not provide', () => {
    render(
      <RunNotice
        descriptors={descriptors}
        resolved={{
          values: { host: 'web-1' },
          issues: [{ input: 'window', message: 'The time range is not set' }],
        }}
      />,
      { wrapper: I18nProvider }
    );
    expect(screen.getByTestId('workflowRunPanelResolutionIssues')).toHaveTextContent(
      'Time window: The time range is not set'
    );
    expect(screen.getByTestId('workflowRunPanelToFill')).toHaveTextContent('Time window');
  });
});
