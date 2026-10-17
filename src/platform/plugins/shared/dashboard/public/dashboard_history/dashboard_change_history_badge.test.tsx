/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import type { ChangeHistoryListItem } from '@kbn/change-history-ui';
import { TestProvider } from '@kbn/change-history-ui/mocks';

import { renderDashboardChangeHistoryBadge } from './dashboard_change_history_badge';

const getItem = (overrides: Partial<ChangeHistoryListItem>): ChangeHistoryListItem => ({
  id: 'c1',
  timestamp: '2026-01-01T00:00:00.000Z',
  actor: { name: 'Hannah' },
  action: 'dashboard_update',
  ...overrides,
});

const renderBadge = (item: ChangeHistoryListItem) =>
  render(<TestProvider>{renderDashboardChangeHistoryBadge({ item } as never)}</TestProvider>);

describe('renderDashboardChangeHistoryBadge', () => {
  it('renders the unsaved changes badge for pending changes', () => {
    renderBadge(getItem({ metadata: { unsavedChanges: true } }));
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('renders the version for past changes', () => {
    renderBadge(getItem({ metadata: { version: 3 } }));
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.queryByText('Current version')).not.toBeInTheDocument();
  });

  it('renders both the current and version badges for the current change', () => {
    renderBadge(getItem({ isCurrent: true, metadata: { version: 4 } }));
    expect(screen.getByText('Current version')).toBeInTheDocument();
    expect(screen.getByText('v4')).toBeInTheDocument();
  });

  it('renders only the current badge when there is no version', () => {
    renderBadge(getItem({ isCurrent: true }));
    expect(screen.getByText('Current version')).toBeInTheDocument();
  });

  it('renders nothing for changes without metadata', () => {
    const { container } = renderBadge(getItem({}));
    expect(container).toBeEmptyDOMElement();
  });
});
