/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { ExportReferencedObjectsResponse } from '@kbn/saved-objects-management-plugin/common';

import { ExportReferencedObjectsFlyout } from './export_referenced_objects_flyout';

const EXPORT_RESPONSE: ExportReferencedObjectsResponse = {
  objects: [
    { type: 'dashboard', id: 'sales', data: { title: 'Sales', panels: [] } },
    { type: 'dashboard', id: 'untitled', data: { title: '' } },
  ],
  problems: [
    {
      type: 'dashboard',
      id: 'sales',
      reason: 'dropped_content',
      message: 'Panel schema not available for panel type: map',
      roots: ['sales'],
    },
  ],
};

// Shaped like core's HttpFetchError, which `isHttpFetchError` recognizes.
const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), {
    name: 'HttpFetchError',
    request: new Request('http://localhost/api/dashboards/_export'),
    response: new Response(null, { status }),
    body: { message },
  });

const renderFlyout = ({
  dashboardIds = ['sales'],
  exportDashboards = jest.fn().mockResolvedValue(EXPORT_RESPONSE),
  downloadExport = jest.fn(),
}: {
  dashboardIds?: string[];
  exportDashboards?: jest.Mock;
  downloadExport?: jest.Mock;
} = {}) => {
  render(
    <I18nProvider>
      <ExportReferencedObjectsFlyout
        dashboardIds={dashboardIds}
        titleId="export-title"
        closeFlyout={jest.fn()}
        exportDashboards={exportDashboards}
        downloadExport={downloadExport}
      />
    </I18nProvider>
  );
  return { exportDashboards, downloadExport };
};

describe('ExportReferencedObjectsFlyout', () => {
  it('lists the objects the export contains', async () => {
    const { exportDashboards } = renderFlyout();

    const table = await screen.findByTestId('exportReferencedObjectsTable');
    expect(exportDashboards).toHaveBeenCalledWith(['sales']);
    expect(screen.getByText('2 objects will be exported.')).toBeInTheDocument();
    expect(within(table).getByText('Sales')).toBeInTheDocument();
    // An object without a title is shown by its ID.
    expect(within(table).getAllByText('untitled')).toHaveLength(2);
  });

  it('groups export problems by the dashboard that led to them', async () => {
    renderFlyout();

    const group = await screen.findByTestId('exportReferencedObjectsProblems-sales');
    expect(within(group).getByRole('heading', { name: 'Sales' })).toBeInTheDocument();
    expect(
      within(group).getByText('dashboard sales: Panel schema not available for panel type: map')
    ).toBeInTheDocument();
  });

  it('lists data views by name, or by index pattern, and groups their problems under the dashboard', async () => {
    renderFlyout({
      exportDashboards: jest.fn().mockResolvedValue({
        objects: [
          { type: 'index-pattern', id: 'logs', data: { name: 'Logs', index_pattern: 'logs-*' } },
          { type: 'index-pattern', id: 'metrics', data: { index_pattern: 'metrics-*' } },
          { type: 'dashboard', id: 'sales', data: { title: 'Sales' } },
        ],
        problems: [
          {
            type: 'index-pattern',
            id: 'gone',
            reason: 'not_found',
            message: "Saved object [index-pattern/gone] is referenced but doesn't exist.",
            roots: ['sales'],
          },
          {
            type: 'visualization',
            id: 'legacy',
            reason: 'unsupported_type',
            message: "Saved objects of type [visualization] can't be exported.",
            roots: ['sales'],
          },
        ],
      }),
    });

    const table = await screen.findByTestId('exportReferencedObjectsTable');
    expect(within(table).getByText('Logs')).toBeInTheDocument();
    expect(within(table).getByText('metrics-*')).toBeInTheDocument();
    const group = screen.getByTestId('exportReferencedObjectsProblems-sales');
    expect(within(group).getByRole('heading', { name: 'Sales' })).toBeInTheDocument();
    expect(within(group).getAllByRole('listitem')).toHaveLength(2);
  });

  it('downloads the export response unchanged, named after the dashboard', async () => {
    const { downloadExport } = renderFlyout();

    await userEvent.click(await screen.findByRole('button', { name: 'Download' }));

    expect(downloadExport).toHaveBeenCalledWith(
      'Sales.json',
      JSON.stringify(EXPORT_RESPONSE, null, 2)
    );
  });

  it('shows the loading state and keeps Download disabled until the export arrives', async () => {
    renderFlyout({ exportDashboards: jest.fn(() => new Promise(() => {})) });

    expect(screen.getByRole('progressbar', { name: 'Preparing the export' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
  });

  it('exports several dashboards at once, listing shared objects once and problems per dashboard', async () => {
    const response: ExportReferencedObjectsResponse = {
      objects: [
        { type: 'dashboard', id: 'sales', data: { title: 'Sales' } },
        { type: 'dashboard', id: 'ops', data: { title: 'Ops' } },
        { type: 'index-pattern', id: 'logs', data: { name: 'Logs', index_pattern: 'logs-*' } },
      ],
      problems: [
        {
          type: 'index-pattern',
          id: 'gone',
          reason: 'not_found',
          message: "Saved object [index-pattern/gone] is referenced but doesn't exist.",
          roots: ['sales', 'ops'],
        },
        {
          type: 'map',
          id: 'legacy-map',
          reason: 'unsupported_type',
          message: "Saved objects of type [map] can't be exported.",
          roots: ['ops'],
        },
      ],
    };
    const { exportDashboards, downloadExport } = renderFlyout({
      dashboardIds: ['sales', 'ops'],
      exportDashboards: jest.fn().mockResolvedValue(response),
    });

    const table = await screen.findByTestId('exportReferencedObjectsTable');
    expect(exportDashboards).toHaveBeenCalledWith(['sales', 'ops']);
    expect(screen.getByText('3 objects will be exported.')).toBeInTheDocument();
    expect(within(table).getByText('Logs')).toBeInTheDocument();

    const salesGroup = screen.getByTestId('exportReferencedObjectsProblems-sales');
    expect(within(salesGroup).getByRole('heading', { name: 'Sales' })).toBeInTheDocument();
    expect(within(salesGroup).getAllByRole('listitem')).toHaveLength(1);
    const opsGroup = screen.getByTestId('exportReferencedObjectsProblems-ops');
    expect(within(opsGroup).getByRole('heading', { name: 'Ops' })).toBeInTheDocument();
    expect(within(opsGroup).getAllByRole('listitem')).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(downloadExport).toHaveBeenCalledTimes(1);
    expect(downloadExport).toHaveBeenCalledWith('export.json', JSON.stringify(response, null, 2));
  });

  it("shows the server's message for a 4xx error", async () => {
    renderFlyout({
      exportDashboards: jest.fn().mockRejectedValue(httpError(400, 'Error fetching objects')),
    });

    const callout = await screen.findByTestId('exportReferencedObjectsError');
    expect(within(callout).getByText('Error fetching objects')).toBeInTheDocument();
  });

  it('shows a generic message for a 5xx error', async () => {
    renderFlyout({
      exportDashboards: jest.fn().mockRejectedValue(httpError(500, 'Internal details')),
    });

    const callout = await screen.findByTestId('exportReferencedObjectsError');
    expect(within(callout).queryByText('Internal details')).not.toBeInTheDocument();
    expect(
      within(callout).getByText('Something went wrong. Try again, or check the Kibana server logs.')
    ).toBeInTheDocument();
  });

  it('asks to save a dashboard that was never saved', () => {
    const exportDashboards = jest.fn();
    render(
      <I18nProvider>
        <ExportReferencedObjectsFlyout
          dashboardIds={[]}
          titleId="export-title"
          closeFlyout={jest.fn()}
          exportDashboards={exportDashboards}
          downloadExport={jest.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Save the dashboard first')).toBeInTheDocument();
    expect(exportDashboards).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
  });
});
