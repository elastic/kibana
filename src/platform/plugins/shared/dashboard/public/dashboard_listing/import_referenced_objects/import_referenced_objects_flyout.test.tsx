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
import type { ImportReferencedObjectsResponse } from '@kbn/saved-objects-management-plugin/common';

import { ImportReferencedObjectsFlyout } from './import_referenced_objects_flyout';

const OBJECTS = [
  { type: 'dashboard', id: 'sales', data: { title: 'Sales' } },
  { type: 'dashboard', id: 'ops', data: { title: 'Ops' } },
];
const EXPORT_FILE = new File([JSON.stringify({ objects: OBJECTS, problems: [] })], 'sales.json', {
  type: 'application/json',
});

const IMPORT_RESPONSE: ImportReferencedObjectsResponse = {
  success: false,
  results: [
    { type: 'dashboard', id: 'sales', destination_id: 'sales', status: 'created' },
    { type: 'dashboard', id: 'ops', destination_id: 'ops', status: 'conflict' },
    {
      type: 'map',
      id: 'roads',
      destination_id: 'roads',
      status: 'error',
      error: {
        type: 'unsupported_type',
        message: "Saved objects of type [map] can't be imported.",
      },
    },
  ],
  warnings: [],
};

// Shaped like core's HttpFetchError, which `isHttpFetchError` recognizes.
const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), {
    name: 'HttpFetchError',
    request: new Request('http://localhost/api/dashboards/_import'),
    response: new Response(null, { status }),
    body: { message },
  });

const renderFlyout = ({
  importObjects = jest.fn().mockResolvedValue(IMPORT_RESPONSE),
  onImportComplete = jest.fn(),
}: {
  importObjects?: jest.Mock;
  onImportComplete?: jest.Mock;
} = {}) => {
  render(
    <I18nProvider>
      <ImportReferencedObjectsFlyout
        titleId="import-title"
        closeFlyout={jest.fn()}
        importObjects={importObjects}
        onImportComplete={onImportComplete}
      />
    </I18nProvider>
  );
  return { importObjects, onImportComplete };
};

const chooseFile = async (file: File) =>
  userEvent.upload(screen.getByLabelText('Export file'), file);

describe('ImportReferencedObjectsFlyout', () => {
  it('imports the objects of the chosen file in the "request action" mode by default', async () => {
    const { importObjects } = renderFlyout();
    const importButton = screen.getByRole('button', { name: 'Import' });
    expect(importButton).toBeDisabled();

    await chooseFile(EXPORT_FILE);
    expect(await screen.findByText('2 objects in the file.')).toBeInTheDocument();
    await userEvent.click(importButton);

    expect(importObjects).toHaveBeenCalledWith({ objects: OBJECTS, mode: 'request_action' });
  });

  it('imports in overwrite mode when chosen', async () => {
    const { importObjects } = renderFlyout();

    await chooseFile(EXPORT_FILE);
    await userEvent.click(screen.getByLabelText('Overwrite existing objects'));
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(importObjects).toHaveBeenCalledWith({ objects: OBJECTS, mode: 'overwrite' });
  });

  it('imports as new copies when chosen', async () => {
    const { importObjects } = renderFlyout();

    await chooseFile(EXPORT_FILE);
    await userEvent.click(screen.getByLabelText('Create new objects with new IDs'));
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(importObjects).toHaveBeenCalledWith({ objects: OBJECTS, mode: 'new_copies' });
  });

  it('lists the existing objects that new copies reuse', async () => {
    renderFlyout({
      importObjects: jest.fn().mockResolvedValue({
        success: true,
        results: [
          {
            type: 'index-pattern',
            id: 'logs',
            destination_id: 'logs',
            status: 'reused',
          },
          { type: 'tag', id: 'web', destination_id: 'web', status: 'reused' },
          { type: 'dashboard', id: 'sales', destination_id: 'sales-copy', status: 'created' },
        ],
        warnings: [],
      } satisfies ImportReferencedObjectsResponse),
    });

    await chooseFile(EXPORT_FILE);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(await screen.findByText('1 of 3 objects imported, 2 reused')).toBeInTheDocument();
    const reused = screen.getByTestId('importReferencedObjectsReused');
    expect(
      within(reused)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['index-pattern logs', 'tag web']);
    const table = screen.getByTestId('importReferencedObjectsResults');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Reused'),
      expect.stringContaining('Reused'),
      expect.stringContaining('sales-copy'),
    ]);
  });

  it('lists each missing reference with the results', async () => {
    renderFlyout({
      importObjects: jest.fn().mockResolvedValue({
        success: true,
        results: [{ type: 'dashboard', id: 'sales', destination_id: 'sales', status: 'created' }],
        warnings: [
          {
            type: 'missing_reference',
            from: { type: 'dashboard', id: 'sales' },
            reference: { type: 'index-pattern', id: 'logs' },
          },
          {
            type: 'missing_reference',
            from: { type: 'dashboard', id: 'sales' },
            reference: { type: 'search', id: 'errors' },
          },
        ],
      } satisfies ImportReferencedObjectsResponse),
    });

    await chooseFile(EXPORT_FILE);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(await screen.findByText('1 of 1 objects imported')).toBeInTheDocument();
    const warnings = screen.getByTestId('importReferencedObjectsWarnings');
    expect(within(warnings).getByText('2 referenced objects are missing')).toBeInTheDocument();
    expect(
      within(warnings)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual([
      'dashboard sales points to index-pattern logs, which is in neither the file nor this space.',
      'dashboard sales points to search errors, which is in neither the file nor this space.',
    ]);
  });

  it('lists a missing reference once when both calls report it', async () => {
    const warning = {
      type: 'missing_reference' as const,
      from: { type: 'dashboard', id: 'ops' },
      reference: { type: 'index-pattern', id: 'logs' },
    };
    const importObjects = jest
      .fn()
      .mockResolvedValueOnce({
        success: false,
        results: [{ type: 'dashboard', id: 'ops', destination_id: 'ops', status: 'conflict' }],
        warnings: [warning],
      } satisfies ImportReferencedObjectsResponse)
      .mockResolvedValueOnce({
        success: true,
        results: [{ type: 'dashboard', id: 'ops', destination_id: 'ops', status: 'overwritten' }],
        warnings: [warning],
      } satisfies ImportReferencedObjectsResponse);
    renderFlyout({ importObjects });

    await chooseFile(EXPORT_FILE);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    await userEvent.click(await screen.findByLabelText('Overwrite'));
    await userEvent.click(screen.getByRole('button', { name: 'Finish import' }));

    const warnings = await screen.findByTestId('importReferencedObjectsWarnings');
    expect(within(warnings).getAllByRole('listitem')).toHaveLength(1);
  });

  it("doesn't list a missing reference of an object that was skipped", async () => {
    const warning = {
      type: 'missing_reference' as const,
      from: { type: 'dashboard', id: 'ops' },
      reference: { type: 'index-pattern', id: 'logs' },
    };
    const importObjects = jest
      .fn()
      .mockResolvedValueOnce({
        success: false,
        results: [{ type: 'dashboard', id: 'ops', destination_id: 'ops', status: 'conflict' }],
        warnings: [warning],
      } satisfies ImportReferencedObjectsResponse)
      .mockResolvedValueOnce({
        success: true,
        results: [{ type: 'dashboard', id: 'ops', destination_id: 'ops', status: 'skipped' }],
        warnings: [],
      } satisfies ImportReferencedObjectsResponse);
    renderFlyout({ importObjects });

    await chooseFile(EXPORT_FILE);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    await userEvent.click(screen.getByRole('button', { name: 'Finish import' }));

    expect(await screen.findByTestId('importReferencedObjectsResults')).toBeInTheDocument();
    expect(screen.queryByTestId('importReferencedObjectsWarnings')).not.toBeInTheDocument();
  });

  it('asks for a decision on each conflict, then shows the results of both calls', async () => {
    const importObjects = jest
      .fn()
      .mockResolvedValueOnce({
        success: false,
        results: [
          { type: 'dashboard', id: 'sales', destination_id: 'sales', status: 'conflict' },
          { type: 'dashboard', id: 'ops', destination_id: 'ops-in-space', status: 'conflict' },
          { type: 'index-pattern', id: 'logs', destination_id: 'logs', status: 'created' },
        ],
        warnings: [],
      } satisfies ImportReferencedObjectsResponse)
      .mockResolvedValueOnce({
        success: true,
        results: [
          { type: 'dashboard', id: 'sales', destination_id: 'sales', status: 'skipped' },
          { type: 'dashboard', id: 'ops', destination_id: 'ops-in-space', status: 'overwritten' },
        ],
        warnings: [],
      } satisfies ImportReferencedObjectsResponse);
    const { onImportComplete } = renderFlyout({ importObjects });

    await chooseFile(EXPORT_FILE);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(
      await screen.findByText('2 objects already exist. Choose what to do with each one.')
    ).toBeInTheDocument();
    const sales = screen.getByRole('group', { name: 'dashboard sales' });
    const ops = screen.getByRole('group', { name: 'dashboard ops' });
    expect(within(sales).getByLabelText('Skip')).toBeChecked();
    expect(within(ops).getByLabelText('Skip')).toBeChecked();
    await userEvent.click(within(ops).getByLabelText('Overwrite'));
    await userEvent.click(screen.getByRole('button', { name: 'Finish import' }));

    expect(importObjects).toHaveBeenLastCalledWith({
      objects: OBJECTS,
      mode: 'request_action',
      decisions: [
        { type: 'dashboard', id: 'sales', destination_id: 'sales', action: 'skip' },
        { type: 'dashboard', id: 'ops', destination_id: 'ops-in-space', action: 'overwrite' },
      ],
    });
    const table = await screen.findByTestId('importReferencedObjectsResults');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Skipped'),
      expect.stringContaining('Overwritten'),
      expect.stringContaining('Created'),
    ]);
    expect(screen.getByText('2 of 3 objects imported')).toBeInTheDocument();
    expect(onImportComplete).toHaveBeenCalledTimes(2);
  });

  it('shows a result for every object', async () => {
    const { onImportComplete } = renderFlyout({
      importObjects: jest.fn().mockResolvedValue({
        ...IMPORT_RESPONSE,
        results: IMPORT_RESPONSE.results.filter(({ status }) => status !== 'conflict'),
      }),
    });

    await chooseFile(EXPORT_FILE);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    const table = await screen.findByTestId('importReferencedObjectsResults');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Created'),
      expect.stringContaining("Saved objects of type [map] can't be imported."),
    ]);
    expect(screen.getByText('1 of 2 objects imported')).toBeInTheDocument();
    expect(onImportComplete).toHaveBeenCalled();
  });

  it('rejects a file that is not an export with referenced objects', async () => {
    const { importObjects } = renderFlyout();

    await chooseFile(
      new File(['{"title":"Sales"}'], 'dashboard.json', { type: 'application/json' })
    );

    expect(
      await screen.findByText("The file isn't an export with referenced objects.")
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    expect(importObjects).not.toHaveBeenCalled();
  });

  it("shows the server's message for a 4xx error", async () => {
    renderFlyout({
      importObjects: jest
        .fn()
        .mockRejectedValue(httpError(400, "Can't import more than 2 objects")),
    });

    await chooseFile(EXPORT_FILE);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    const callout = await screen.findByTestId('importReferencedObjectsError');
    expect(within(callout).getByText("Can't import more than 2 objects")).toBeInTheDocument();
  });

  it('shows a generic message for a 5xx error', async () => {
    renderFlyout({
      importObjects: jest.fn().mockRejectedValue(httpError(500, 'Internal details')),
    });

    await chooseFile(EXPORT_FILE);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    const callout = await screen.findByTestId('importReferencedObjectsError');
    expect(within(callout).queryByText('Internal details')).not.toBeInTheDocument();
  });
});
