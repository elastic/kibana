/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { renderWorkflowChangeHistoryChangesSummary } from './workflow_change_history_changes_summary';

describe('renderWorkflowChangeHistoryChangesSummary', () => {
  it('renders workflow summary groups', () => {
    render(
      <I18nProvider>
        {renderWorkflowChangeHistoryChangesSummary({
          item: {
            id: 'evt-1',
            timestamp: '2026-06-16T12:00:00.000Z',
            actor: { name: 'Alice' },
            action: 'Updated',
          },
          changes: {
            count: 4,
            summary: [
              {
                title: 'Steps:',
                lines: ['1 added', '2 removed'],
              },
            ],
          },
          summary: [
            {
              title: 'Steps:',
              lines: ['1 added', '2 removed'],
            },
          ],
        })}
      </I18nProvider>
    );

    expect(screen.getByTestId('workflowChangeHistoryItemChangesSummary')).toBeInTheDocument();
    expect(screen.getByText('Steps:')).toBeInTheDocument();
    expect(screen.getByText('1 added')).toBeInTheDocument();
  });

  it('returns null for invalid summary payloads', () => {
    const result = renderWorkflowChangeHistoryChangesSummary({
      item: {
        id: 'evt-1',
        timestamp: '2026-06-16T12:00:00.000Z',
        actor: { name: 'Alice' },
        action: 'Updated',
      },
      changes: { count: 1, summary: { steps: 1 } },
      summary: { steps: 1 },
    });

    expect(result).toBeNull();
  });
});
