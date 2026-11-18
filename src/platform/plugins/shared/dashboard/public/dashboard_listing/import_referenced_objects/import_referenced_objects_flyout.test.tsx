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

  it('shows a result for every object', async () => {
    const { onImportComplete } = renderFlyout();

    await chooseFile(EXPORT_FILE);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    const table = await screen.findByTestId('importReferencedObjectsResults');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Created'),
      expect.stringContaining('Conflict'),
      expect.stringContaining("Saved objects of type [map] can't be imported."),
    ]);
    expect(screen.getByText('1 of 3 objects imported')).toBeInTheDocument();
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
