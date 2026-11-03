/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import JSZip from 'jszip';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { DashboardTerraformResponseBody } from '../../../../../server';
import { TerraformExportFlyout } from './terraform_export_flyout';

const mockPost = jest.fn();
const mockGetActiveSpace = jest.fn();
jest.mock('../../../../services/kibana_services', () => ({
  coreServices: { http: { post: (...args: unknown[]) => mockPost(...args) } },
  spacesService: { getActiveSpace: () => mockGetActiveSpace() },
}));

const mockDownloadFileAs = jest.fn();
jest.mock('@kbn/share-plugin/public', () => ({
  downloadFileAs: (...args: unknown[]) => mockDownloadFileAs(...args),
}));

const sanitized = { title: 'Web logs', panels: [] };
const conversion: DashboardTerraformResponseBody = {
  resource_type: 'elasticstack_kibana_dashboard',
  body: { title: 'Web logs', description: 'Costs $${var.env}' },
  dropped_fields: [],
  skipped_panels: [],
  provider: { source: 'elastic/elasticstack', version: '9.9.9' },
};

const respondWith = (terraform: () => Promise<DashboardTerraformResponseBody>) =>
  mockPost.mockImplementation(async (path: string) =>
    path.endsWith('/_sanitize') ? { data: sanitized, warnings: [] } : terraform()
  );

const renderFlyout = (
  title = 'Web logs',
  { dashboardId, isDirty = false }: { dashboardId?: string; isDirty?: boolean } = {}
) =>
  renderWithI18n(
    <TerraformExportFlyout
      title={title}
      dashboardId={dashboardId}
      isDirty={isDirty}
      getExportJson={() => ({ title })}
      closeFlyout={jest.fn()}
    />
  );

const fileList = () => screen.getByRole('list', { name: 'Module files' });

const fileNames = () =>
  within(fileList())
    .getAllByRole('button', { name: /^(?!Download )/ })
    .map((button) => button.textContent);

const showFile = async (name: string) => {
  await userEvent.click(within(fileList()).getByRole('button', { name }));
  return screen.getByTestId('dashboardTerraformExportFileContent').textContent ?? '';
};

const downloadZip = async () => {
  mockDownloadFileAs.mockClear();
  await userEvent.click(screen.getByRole('button', { name: 'Download zip' }));
  expect(mockDownloadFileAs).toHaveBeenCalledTimes(1);
  const [filename, blob] = mockDownloadFileAs.mock.calls[0];
  const zip = await JSZip.loadAsync(await new Response(blob).arrayBuffer());
  const entries: Record<string, string> = {};
  for (const file of Object.values(zip.files).filter(({ dir }) => !dir)) {
    entries[file.name] = await file.async('string');
  }
  return { filename, entries };
};

const shownFiles = async (folder: string) => {
  const shown: Record<string, string> = {};
  for (const name of fileNames()) shown[`${folder}/${name}`] = await showFile(name ?? '');
  return shown;
};

const modeButton = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  mockPost.mockReset();
  mockDownloadFileAs.mockReset();
  mockGetActiveSpace.mockReset();
  mockGetActiveSpace.mockResolvedValue({ id: 'default' });
});

describe('TerraformExportFlyout', () => {
  it('sends the sanitized dashboard to the conversion route', async () => {
    respondWith(async () => conversion);
    renderFlyout();

    await screen.findByRole('list', { name: 'Module files' });
    expect(mockPost).toHaveBeenLastCalledWith(
      '/internal/dashboards/_terraform',
      expect.objectContaining({ version: '1', body: JSON.stringify({ dashboard: sanitized }) })
    );
  });

  it('shows the module files of a new copy and the provider version', async () => {
    respondWith(async () => conversion);
    renderFlyout();

    await screen.findByRole('list', { name: 'Module files' });
    expect(
      within(fileList())
        .getAllByRole('button', { name: /^(?!Download )/ })
        .map((button) => button.textContent)
    ).toEqual(['versions.tf.json', 'main.tf.json', 'README.md']);
    expect(screen.getByText('elastic/elasticstack ≥ 9.9.9')).toBeInTheDocument();

    expect(JSON.parse(await showFile('versions.tf.json'))).toEqual({
      terraform: {
        required_providers: {
          elasticstack: { source: 'elastic/elasticstack', version: '>= 9.9.9' },
        },
      },
      provider: { elasticstack: {} },
    });
    expect(JSON.parse(await showFile('main.tf.json'))).toEqual({
      resource: {
        elasticstack_kibana_dashboard: {
          web_logs: { title: 'Web logs', description: 'Costs $${var.env}' },
        },
      },
    });
    expect(await showFile('README.md')).toContain('terraform init');
  });

  it('adopts a saved dashboard: pins its ID and space and imports it', async () => {
    mockGetActiveSpace.mockResolvedValue({ id: 'marketing' });
    respondWith(async () => conversion);
    renderFlyout('Web logs', { dashboardId: 'abc-123' });

    await screen.findByRole('list', { name: 'Module files' });
    expect(modeButton('Adopt this dashboard')).toHaveAttribute('aria-pressed', 'true');
    expect(fileNames()).toEqual([
      'versions.tf.json',
      'main.tf.json',
      'imports.tf.json',
      'README.md',
    ]);
    const main = JSON.parse(await showFile('main.tf.json'));
    expect(main.resource.elasticstack_kibana_dashboard.web_logs).toEqual({
      space_id: 'marketing',
      dashboard_id: 'abc-123',
      title: 'Web logs',
      description: 'Costs $${var.env}',
    });
    expect(JSON.parse(await showFile('imports.tf.json'))).toEqual({
      import: [{ to: 'elasticstack_kibana_dashboard.web_logs', id: 'marketing/abc-123' }],
    });
    expect(await showFile('README.md')).toContain(
      '1 to import, 0 to add, 0 to change, 0 to destroy'
    );

    const { entries } = await downloadZip();
    expect(entries).toEqual(await shownFiles('web_logs'));
  });

  it('switches a saved dashboard to a new copy: no IDs and no imports, in the files and the zip', async () => {
    respondWith(async () => conversion);
    renderFlyout('Web logs', { dashboardId: 'abc-123' });

    await screen.findByRole('list', { name: 'Module files' });
    await userEvent.click(modeButton('New copy'));

    expect(modeButton('New copy')).toHaveAttribute('aria-pressed', 'true');
    expect(fileNames()).toEqual(['versions.tf.json', 'main.tf.json', 'README.md']);
    const main = JSON.parse(await showFile('main.tf.json'));
    expect(main.resource.elasticstack_kibana_dashboard.web_logs).toEqual(conversion.body);
    expect(await showFile('README.md')).toContain('1 to add, 0 to change, 0 to destroy');

    const { entries } = await downloadZip();
    expect(Object.keys(entries)).toEqual([
      'web_logs/versions.tf.json',
      'web_logs/main.tf.json',
      'web_logs/README.md',
    ]);
    expect(entries).toEqual(await shownFiles('web_logs'));
  });

  it('offers only a new copy of a dashboard that was never saved, and says why', async () => {
    respondWith(async () => conversion);
    renderFlyout('Web logs');

    await screen.findByRole('list', { name: 'Module files' });
    expect(modeButton('Adopt this dashboard')).toBeDisabled();
    expect(modeButton('New copy')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('This export includes unsaved changes')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This dashboard has never been saved, so it can only be exported as a new copy. Save it to adopt it.'
      )
    ).toBeInTheDocument();
    expect(fileNames()).not.toContain('imports.tf.json');
  });

  it('says when the export of a saved dashboard includes unsaved changes', async () => {
    respondWith(async () => conversion);
    renderFlyout('Web logs', { dashboardId: 'abc-123', isDirty: true });

    await screen.findByRole('list', { name: 'Module files' });
    expect(screen.getByText('This export includes unsaved changes')).toBeInTheDocument();
    expect(modeButton('Adopt this dashboard')).toBeEnabled();
  });

  it('says nothing about unsaved changes when the dashboard is saved as shown', async () => {
    respondWith(async () => conversion);
    renderFlyout('Web logs', { dashboardId: 'abc-123' });

    await screen.findByRole('list', { name: 'Module files' });
    expect(screen.queryByText('This export includes unsaved changes')).not.toBeInTheDocument();
  });

  it('writes template sequences in an adopted ID literally', async () => {
    respondWith(async () => conversion);
    renderFlyout('Web logs', { dashboardId: 'id-${x}-%{y}' });

    await screen.findByRole('list', { name: 'Module files' });
    const main = JSON.parse(await showFile('main.tf.json'));
    expect(main.resource.elasticstack_kibana_dashboard.web_logs.dashboard_id).toBe(
      'id-$${x}-%%{y}'
    );
    expect(JSON.parse(await showFile('imports.tf.json')).import[0].id).toBe(
      'default/id-$${x}-%%{y}'
    );
  });

  it.each([
    ['2024 Q1 — Ünïcode!', '_2024_q1_unicode'],
    ['!!!', 'dashboard'],
    ['', 'dashboard'],
  ])('names the resource of "%s" %s', async (title, name) => {
    respondWith(async () => conversion);
    renderFlyout(title);

    await screen.findByRole('list', { name: 'Module files' });
    const main = JSON.parse(await showFile('main.tf.json'));
    expect(Object.keys(main.resource.elasticstack_kibana_dashboard)).toEqual([name]);
  });

  it('downloads one zip with every file shown, inside one folder', async () => {
    respondWith(async () => conversion);
    renderFlyout('Web logs');

    await screen.findByRole('list', { name: 'Module files' });
    const shown: Record<string, string> = {};
    for (const name of ['versions.tf.json', 'main.tf.json', 'README.md']) {
      shown[`web_logs/${name}`] = await showFile(name);
    }
    await userEvent.click(screen.getByRole('button', { name: 'Download zip' }));

    expect(mockDownloadFileAs).toHaveBeenCalledTimes(1);
    const [filename, blob] = mockDownloadFileAs.mock.calls[0];
    expect(filename).toBe('Web logs.zip');
    const zip = await JSZip.loadAsync(await new Response(blob).arrayBuffer());
    const files = Object.values(zip.files).filter(({ dir }) => !dir);
    const entries: Record<string, string> = {};
    for (const file of files) entries[file.name] = await file.async('string');
    expect(entries).toEqual(shown);
  });

  it('downloads a single file as shown', async () => {
    respondWith(async () => conversion);
    renderFlyout('Web logs');

    await screen.findByRole('list', { name: 'Module files' });
    const shown = await showFile('main.tf.json');
    await userEvent.click(screen.getByRole('button', { name: 'Download main.tf.json' }));

    expect(mockDownloadFileAs).toHaveBeenCalledWith('main.tf.json', {
      content: shown,
      type: 'text/plain',
    });
  });

  it('shows loading until the conversion returns', async () => {
    let resolve: (body: DashboardTerraformResponseBody) => void = () => {};
    respondWith(() => new Promise((r) => (resolve = r)));
    renderFlyout();

    expect(
      await screen.findByRole('progressbar', { name: 'Converting the dashboard' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download zip' })).toBeDisabled();
    resolve(conversion);
    await screen.findByRole('list', { name: 'Module files' });
    expect(screen.getByRole('button', { name: 'Download zip' })).toBeEnabled();
  });

  it("shows the server's message for a client error", async () => {
    respondWith(async () => {
      throw Object.assign(new Error('Bad Request'), {
        response: { status: 400 },
        body: { message: 'panels: expected a list' },
      });
    });
    renderFlyout();

    expect(await screen.findByText('panels: expected a list')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download zip' })).toBeDisabled();
  });

  it('shows a generic message for a server error', async () => {
    respondWith(async () => {
      throw Object.assign(new Error('Internal Server Error'), {
        response: { status: 500 },
        body: { message: 'stack trace with internals' },
      });
    });
    renderFlyout();

    expect(
      await screen.findByText('The dashboard could not be converted. Try again later.')
    ).toBeInTheDocument();
    expect(screen.queryByText('stack trace with internals')).not.toBeInTheDocument();
  });

  it('retries after an error', async () => {
    respondWith(async () => {
      throw Object.assign(new Error('Internal Server Error'), { response: { status: 500 } });
    });
    renderFlyout();

    const tryAgain = await screen.findByRole('button', { name: 'Try again' });
    respondWith(async () => conversion);
    await userEvent.click(tryAgain);
    await waitFor(() => expect(screen.getByRole('list', { name: 'Module files' })));
  });
});
