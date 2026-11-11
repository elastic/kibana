/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@kbn/code-editor-mock/jest_helper';
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { DashboardApi } from '../../../../dashboard_api/types';
import { FromJsonTab } from './from_json_tab';

const mockPost = jest.fn();
const mockAddSuccess = jest.fn();
const mockGetEmbeddableDefinition = jest.fn();
const mockGetIdsWithTitle = jest.fn();
jest.mock('../../../../services/kibana_services', () => ({
  coreServices: {
    application: { getUrlForApp: jest.fn() },
    http: { post: (...args: unknown[]) => mockPost(...args) },
    notifications: {
      toasts: { addSuccess: (...args: unknown[]) => mockAddSuccess(...args), addDanger: jest.fn() },
    },
  },
  embeddableService: {
    getEmbeddableDefinition: (...args: unknown[]) => mockGetEmbeddableDefinition(...args),
  },
  dataService: {
    dataViews: { getIdsWithTitle: (...args: unknown[]) => mockGetIdsWithTitle(...args) },
  },
}));

const lensPanel = {
  type: 'vis',
  grid: { x: 0, y: 0, w: 12, h: 8 },
  config: {
    type: 'metric',
    title: 'Requests',
    data_source: { type: 'data_view_reference', ref_id: 'logs-data-view' },
    metrics: [{ type: 'primary', operation: 'count' }],
  },
};

const respondWithSanitizedPanels = (relatedItems: object[] = []) =>
  mockPost.mockImplementation(async (_path: string, { body }: { body: string }) => ({
    data: JSON.parse(body),
    ...(relatedItems.length
      ? { related_items: relatedItems, related_items_count: relatedItems.length }
      : {}),
  }));

const createDashboardApi = () =>
  ({
    addIncomingEmbeddables: jest.fn(),
    clearOverlays: jest.fn(),
  } as unknown as DashboardApi);

const renderTab = (dashboardApi = createDashboardApi()) => {
  render(
    <I18nProvider>
      <FromJsonTab dashboardApi={dashboardApi} />
    </I18nProvider>
  );
  return dashboardApi;
};

const paste = (value: unknown) => {
  const editor = within(screen.getByTestId('dashboardPanelJsonEditor')).getByRole('textbox');
  fireEvent.change(editor, {
    target: { value: typeof value === 'string' ? value : JSON.stringify(value) },
  });
};

describe('FromJsonTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmbeddableDefinition.mockResolvedValue({ type: 'vis' });
    mockGetIdsWithTitle.mockResolvedValue([{ id: 'logs-data-view', title: 'logs-*' }]);
    respondWithSanitizedPanels();
  });

  it('tells the user what is needed to continue', async () => {
    renderTab();
    const footerStatus = screen.getByTestId('dashboardPanelJsonFooterStatus');
    expect(footerStatus).toHaveTextContent('Add JSON to continue');

    paste('not json');
    await waitFor(() => expect(footerStatus).toHaveTextContent('Fix the JSON to continue'));

    paste(lensPanel);
    expect(footerStatus).toHaveTextContent('Checking JSON…');
    await waitFor(() => expect(footerStatus).toBeEmptyDOMElement());
  });

  it('adds a pasted panel to the dashboard', async () => {
    const dashboardApi = renderTab();
    expect(screen.getByTestId('dashboardPanelJsonAddButton')).toBeDisabled();

    paste(lensPanel);

    await waitFor(() => expect(screen.getByTestId('dashboardPanelJsonAddButton')).toBeEnabled());
    await userEvent.click(screen.getByTestId('dashboardPanelJsonAddButton'));

    await waitFor(() =>
      expect(dashboardApi.addIncomingEmbeddables).toHaveBeenCalledWith([
        {
          embeddableId: expect.any(String),
          type: 'vis',
          serializedState: lensPanel.config,
          size: { width: 12, height: 8 },
        },
      ])
    );
    expect(dashboardApi.clearOverlays).toHaveBeenCalled();
    expect(mockAddSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Requests was added' })
    );
  });

  it('warns about data views that do not exist in this space but still allows adding the panel', async () => {
    respondWithSanitizedPanels([
      { type: 'index-pattern', type_label: 'Data view', id: 'logs-data-view' },
    ]);
    mockGetIdsWithTitle.mockResolvedValue([]);
    renderTab();

    paste(lensPanel);

    await waitFor(() =>
      expect(screen.getByTestId('dashboardPanelJsonMissingRelatedItemsSummary')).toHaveTextContent(
        'This panel uses a data view that doesn’t exist in this space.'
      )
    );
    expect(screen.getByTestId('dashboardPanelJsonAddButton')).toBeEnabled();
  });

  it('explains what is missing when only the panel config is pasted', async () => {
    renderTab();

    paste(lensPanel.config);

    await waitFor(() =>
      expect(screen.getByText(/The JSON doesn’t describe a dashboard panel/)).toBeInTheDocument()
    );
    expect(mockPost).not.toHaveBeenCalled();
    expect(screen.getByTestId('dashboardPanelJsonAddButton')).toBeDisabled();
  });
});
