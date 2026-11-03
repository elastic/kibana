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

import type {
  DashboardSanitizeResponseBody,
  DashboardTerraformResponseBody,
} from '../../../../../server';
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
  resource_name: 'web_logs',
  body: { title: 'Web logs', description: 'Costs $${var.env}' },
  resources: [],
  links: [],
  tag_resource: { type: 'elasticstack_kibana_tag', min_kibana_version: '9.5.0' },
  dropped_fields: [],
  skipped_panels: [],
  partial_panels: [],
  json_panels: [],
  provider: { source: 'elastic/elasticstack', version: '9.9.9' },
};

const respondWith = (
  terraform: () => Promise<DashboardTerraformResponseBody>,
  sanitizeResult: Omit<DashboardSanitizeResponseBody, 'data'> = {}
) =>
  mockPost.mockImplementation(async (path: string) =>
    path.endsWith('/_sanitize') ? { data: sanitized, ...sanitizeResult } : terraform()
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

const problemDetails = async () => {
  await userEvent.click(await screen.findByRole('button', { name: 'Show details' }));
  const problems = screen.getByRole('list', { name: 'Problems' });
  return within(problems)
    .getAllByRole('listitem')
    .filter((item) => item.parentElement === problems)
    .map((item) => item.textContent);
};

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
    expect(fileNames()).not.toContain('imports.tf.json');
    expect(screen.getByText('Review this export')).toBeInTheDocument();
    expect(await problemDetails()).toEqual([
      'This export includes unsaved changes. This dashboard has never been saved, so it can only be exported as a new copy. Save it to adopt it.',
    ]);
  });

  it('says when the export of a saved dashboard includes unsaved changes', async () => {
    respondWith(async () => conversion);
    renderFlyout('Web logs', { dashboardId: 'abc-123', isDirty: true });

    await screen.findByRole('list', { name: 'Module files' });
    expect(modeButton('Adopt this dashboard')).toBeEnabled();
    expect(screen.getByText('Review this export')).toBeInTheDocument();
    expect(screen.getByText('1 note about this export.')).toBeInTheDocument();
    expect(await problemDetails()).toEqual([
      'This export includes unsaved changes. The files differ from the saved dashboard. If you adopt it, the first plan shows these changes.',
    ]);
  });

  it('says nothing about unsaved changes when the dashboard is saved as shown', async () => {
    respondWith(async () => conversion);
    renderFlyout('Web logs', { dashboardId: 'abc-123' });

    await screen.findByRole('list', { name: 'Module files' });
    expect(screen.queryByText(/unsaved changes/)).not.toBeInTheDocument();
  });

  it('lists what did not export cleanly, most severe first', async () => {
    respondWith(
      async () => ({
        ...conversion,
        skipped_panels: [
          { path: 'panels[1]', type: 'legacy_tsvb', title: 'Requests', reason: 'no variant' },
          { path: 'panels[2].panels[0]', type: 'legacy_tsvb', reason: 'no variant' },
        ],
        dropped_fields: ['not_an_attribute', 'panels[0].config.not_a_markdown_attribute'],
        partial_panels: [
          {
            path: 'panels[0]',
            type: 'markdown',
            title: 'Notes',
            dropped_fields: ['panels[0].config.not_a_markdown_attribute'],
          },
        ],
        json_panels: [{ path: 'panels[3]', type: 'vis', title: 'Old chart', reason: 'no variant' }],
      }),
      {
        warnings: [
          { type: 'dropped_property', key: 'options', message: 'Removed an unsupported setting' },
          {
            type: 'dropped_panel',
            message: 'Panel schema not available for panel type: map.',
            panel_type: 'map',
            panel_config: { savedObjectId: 'm1' },
          },
          {
            type: 'dropped_panel',
            message: 'Panel schema not available for panel type: legacy_vis.',
            panel_type: 'legacy_vis',
            panel_config: { title: 'Instructions' },
          },
        ],
        related_items: [
          { type: 'lens', type_label: 'Visualization', id: 'v1' },
          { type: 'index-pattern', type_label: 'Data view', id: 'd1' },
          { type: 'lens', type_label: 'Visualization', id: 'v2' },
        ],
        related_items_count: 3,
      }
    );
    renderFlyout('Web logs', { dashboardId: 'abc-123', isDirty: true });

    expect(await screen.findByText('Review this export')).toBeInTheDocument();
    expect(screen.getByText('7 problems and 3 notes.')).toBeInTheDocument();
    expect(await problemDetails()).toEqual([
      'A panel of type map is not exported.',
      'Panel “Instructions” (legacy_vis) is not exported.',
      'Panel “Requests” (legacy_tsvb) is not exported.',
      'Panel panels[2].panels[0] (legacy_tsvb) is not exported.',
      'Panel “Notes” (markdown) is exported partially. Dropped:panels[0].config.not_a_markdown_attribute',
      'Dropped not_an_attribute: the resource has no attribute for it.',
      'Panel “Old chart” (vis) is exported as a JSON string.',
      'Removed an unsupported setting',
      'This export includes unsaved changes. The files differ from the saved dashboard. If you adopt it, the first plan shows these changes.',
      'The dashboard refers to 3 objects that are not exported. They must exist where Terraform runs.Visualization: 2Data view: 1',
    ]);
  });

  it('shows no callout when everything on the dashboard is exported', async () => {
    respondWith(async () => conversion);
    renderFlyout('Web logs', { dashboardId: 'abc-123' });

    await screen.findByRole('list', { name: 'Module files' });
    expect(screen.queryByTestId('dashboardTerraformExportProblems')).not.toBeInTheDocument();
  });

  it('dismisses the callout', async () => {
    respondWith(async () => ({
      ...conversion,
      skipped_panels: [{ path: 'panels[0]', type: 'legacy_tsvb', reason: 'no variant' }],
    }));
    renderFlyout('Web logs', { dashboardId: 'abc-123' });

    expect(await screen.findByText('1 problem.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByTestId('dashboardTerraformExportProblems')).not.toBeInTheDocument();
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

  describe('tags', () => {
    const tagType = 'elasticstack_kibana_tag';
    const tagged: DashboardTerraformResponseBody = {
      ...conversion,
      body: {
        ...conversion.body,
        tags: [
          '${elasticstack_kibana_tag.production.tag_id}',
          '${elasticstack_kibana_tag.team_a.tag_id}',
          'unreadable-tag',
        ],
      },
      resources: [
        {
          type: tagType,
          name: 'production',
          id: 'tag-1',
          label: 'Production',
          body: { name: 'Production', color: '#772299', description: 'Owned by $${team}' },
        },
        {
          type: tagType,
          name: 'team_a',
          id: 'tag-${2}',
          label: 'Team ${a}',
          body: { name: 'Team $${a}', color: '#000000', description: '' },
        },
      ],
      links: [
        { path: ['tags', 0], resource_type: tagType, resource_name: 'production' },
        { path: ['tags', 1], resource_type: tagType, resource_name: 'team_a' },
      ],
    };
    const relatedItems = {
      related_items: [
        { type: 'tag', type_label: 'Tag', id: 'tag-1' },
        { type: 'tag', type_label: 'Tag', id: 'tag-${2}' },
        { type: 'tag', type_label: 'Tag', id: 'unreadable-tag' },
        { type: 'lens', type_label: 'Visualization', id: 'v1' },
      ],
      related_items_count: 4,
    };

    it('writes the tags of a new copy as tag resources pinning no ID, which the dashboard references', async () => {
      respondWith(async () => tagged);
      renderFlyout();

      await screen.findByRole('list', { name: 'Module files' });
      expect(fileNames()).toEqual([
        'versions.tf.json',
        'main.tf.json',
        'tags.tf.json',
        'README.md',
      ]);
      expect(JSON.parse(await showFile('tags.tf.json'))).toEqual({
        resource: {
          elasticstack_kibana_tag: {
            production: { name: 'Production', color: '#772299', description: 'Owned by $${team}' },
            team_a: { name: 'Team $${a}', color: '#000000', description: '' },
          },
        },
      });
      const main = JSON.parse(await showFile('main.tf.json'));
      expect(main.resource.elasticstack_kibana_dashboard.web_logs.tags).toEqual([
        '${elasticstack_kibana_tag.production.tag_id}',
        '${elasticstack_kibana_tag.team_a.tag_id}',
        'unreadable-tag',
      ]);
      expect(await showFile('README.md')).toContain(
        "delete `tags.tf.json` and set the dashboard's `tags` in `main.tf.json` to the IDs of existing tags"
      );

      const { entries } = await downloadZip();
      expect(entries).toEqual(await shownFiles('web_logs'));
    });

    it('keeps the literal tag IDs of an adopted dashboard and writes no tags file', async () => {
      respondWith(async () => tagged);
      renderFlyout('Web logs', { dashboardId: 'abc-123' });

      await screen.findByRole('list', { name: 'Module files' });
      expect(fileNames()).not.toContain('tags.tf.json');
      const main = JSON.parse(await showFile('main.tf.json'));
      expect(main.resource.elasticstack_kibana_dashboard.web_logs.tags).toEqual([
        'tag-1',
        'tag-$${2}',
        'unreadable-tag',
      ]);
      expect(await showFile('README.md')).not.toContain('tags.tf.json');
    });

    it('names the tags a new copy creates, warns about existing names, and notes the target Kibana version', async () => {
      respondWith(async () => tagged, relatedItems);
      renderFlyout('Web logs', { dashboardId: 'abc-123' });
      await screen.findByRole('list', { name: 'Module files' });
      await userEvent.click(modeButton('New copy'));

      expect(await screen.findByText('Review this export')).toBeInTheDocument();
      expect(screen.getByText('1 problem and 2 notes.')).toBeInTheDocument();
      expect(await problemDetails()).toEqual([
        'A new copy creates 2 tags. Kibana refuses a tag whose name already exists, so apply fails if the target already has a tag with one of these names:ProductionTeam ${a}',
        'The tags file needs Kibana 9.5.0 or later where Terraform applies it.',
        'The dashboard refers to 2 objects that are not exported. They must exist where Terraform runs.Tag: 1Visualization: 1',
      ]);
    });

    it('lists the tags as objects not exported when adopting', async () => {
      respondWith(async () => tagged, relatedItems);
      renderFlyout('Web logs', { dashboardId: 'abc-123' });

      expect(await problemDetails()).toEqual([
        'The dashboard refers to 4 objects that are not exported. They must exist where Terraform runs.Tag: 3Visualization: 1',
      ]);
    });
  });
});
