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
import type { ContentInsightsClientPublic } from '@kbn/content-management-content-insights-public';
import { DefaultActivityRows } from './default_activity_rows';
import type { ContentListItem } from '../../item';

// Mock the content-insights-public components.
jest.mock('@kbn/content-management-content-insights-public', () => ({
  ActivityView: ({ item, entityNamePlural }: { item: object; entityNamePlural: string }) => (
    <div data-test-subj="activity-view">Activity: {entityNamePlural}</div>
  ),
  ViewsStats: ({ item }: { item: { id: string } }) => (
    <div data-test-subj="views-stats">Views for {item.id}</div>
  ),
  ContentInsightsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="content-insights-provider">{children}</div>
  ),
}));

// Mock EUI components.
jest.mock('@elastic/eui', () => ({
  EuiFormRow: ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
    <div data-test-subj="form-row">
      <label>{label}</label>
      {children}
    </div>
  ),
  EuiSpacer: ({ size }: { size: string }) => <div data-test-subj={`spacer-${size}`} />,
  EuiIconTip: ({ content }: { content: React.ReactNode }) => (
    <span data-test-subj="icon-tip" title={String(content)}>
      ℹ
    </span>
  ),
}));

// Mock i18n-react.
jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => (
    <span>{defaultMessage}</span>
  ),
}));

describe('DefaultActivityRows', () => {
  const mockContentInsightsClient = {} as ContentInsightsClientPublic;

  const createMockItem = (overrides?: Partial<ContentListItem>): ContentListItem => ({
    id: 'item-1',
    title: 'Test Item',
    type: 'dashboard',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    createdBy: 'user-1',
    updatedAt: new Date('2024-01-15T00:00:00Z'),
    updatedBy: 'user-2',
    isManaged: false,
    ...overrides,
  });

  it('should render the activity label', () => {
    const item = createMockItem();

    render(
      <DefaultActivityRows
        item={item}
        entityNamePlural="dashboards"
        contentInsightsClient={mockContentInsightsClient}
      />
    );

    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('should render the help text icon tip', () => {
    const item = createMockItem();

    render(
      <DefaultActivityRows
        item={item}
        entityNamePlural="dashboards"
        contentInsightsClient={mockContentInsightsClient}
      />
    );

    expect(screen.getByTestId('icon-tip')).toBeInTheDocument();
  });

  it('should render ActivityView', () => {
    const item = createMockItem();

    render(
      <DefaultActivityRows
        item={item}
        entityNamePlural="dashboards"
        contentInsightsClient={mockContentInsightsClient}
      />
    );

    expect(screen.getByTestId('activity-view')).toBeInTheDocument();
  });

  it('should render ViewsStats', () => {
    const item = createMockItem();

    render(
      <DefaultActivityRows
        item={item}
        entityNamePlural="visualizations"
        contentInsightsClient={mockContentInsightsClient}
      />
    );

    expect(screen.getByTestId('views-stats')).toBeInTheDocument();
  });

  it('should render ActivityView with correct props', () => {
    const item = createMockItem();

    render(
      <DefaultActivityRows
        item={item}
        entityNamePlural="dashboards"
        contentInsightsClient={mockContentInsightsClient}
      />
    );

    expect(screen.getByTestId('activity-view')).toHaveTextContent('Activity: dashboards');
  });

  it('should render ViewsStats wrapped in ContentInsightsProvider', () => {
    const item = createMockItem();

    render(
      <DefaultActivityRows
        item={item}
        entityNamePlural="visualizations"
        contentInsightsClient={mockContentInsightsClient}
      />
    );

    expect(screen.getByTestId('content-insights-provider')).toBeInTheDocument();
    expect(screen.getByTestId('views-stats')).toHaveTextContent('Views for item-1');
  });

  it('should render spacer between ActivityView and ViewsStats', () => {
    const item = createMockItem();

    render(
      <DefaultActivityRows
        item={item}
        entityNamePlural="dashboards"
        contentInsightsClient={mockContentInsightsClient}
      />
    );

    expect(screen.getByTestId('spacer-s')).toBeInTheDocument();
  });

  it('should handle items without dates', () => {
    const item = createMockItem({
      createdAt: undefined,
      updatedAt: undefined,
    });

    // Should not throw.
    expect(() =>
      render(
        <DefaultActivityRows
          item={item}
          entityNamePlural="dashboards"
          contentInsightsClient={mockContentInsightsClient}
        />
      )
    ).not.toThrow();
  });

  it('should handle items without user info', () => {
    const item = createMockItem({
      createdBy: undefined,
      updatedBy: undefined,
    });

    // Should not throw.
    expect(() =>
      render(
        <DefaultActivityRows
          item={item}
          entityNamePlural="dashboards"
          contentInsightsClient={mockContentInsightsClient}
        />
      )
    ).not.toThrow();
  });

  it('should handle managed items', () => {
    const item = createMockItem({
      isManaged: true,
    });

    // Should not throw.
    expect(() =>
      render(
        <DefaultActivityRows
          item={item}
          entityNamePlural="dashboards"
          contentInsightsClient={mockContentInsightsClient}
        />
      )
    ).not.toThrow();
  });
});
