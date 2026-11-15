/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { InspectorPanel } from './inspector_panel';
import type { InspectorViewDescription } from '../types';
import type { Adapters } from '../../common';
import type { ApplicationStart, HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { applicationServiceMock, themeServiceMock } from '@kbn/core/public/mocks';
import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { ThemeServiceStart } from '@kbn/core/public';
import { decodeSnapshot, downloadSnapshot } from '../snapshot/snapshot';
import type { InspectorSnapshot } from '../snapshot/snapshot';
import { RequestAdapter } from '../../common';

jest.mock('../snapshot/snapshot', () => ({
  ...jest.requireActual('../snapshot/snapshot'),
  decodeSnapshot: jest.fn(),
  downloadSnapshot: jest.fn(),
}));

jest.mock('../views/requests/components/requests_view', () => ({
  RequestsViewComponent: () => <div>Imported requests</div>,
}));

describe('InspectorPanel', () => {
  let adapters: Adapters;
  let views: InspectorViewDescription[];

  const dependencies = {
    application: applicationServiceMock.createStartContract(),
    http: {},
    share: sharePluginMock.createStartContract(),
    uiSettings: {},
    settings: settingsServiceMock.createStartContract(),
    theme: themeServiceMock.createStartContract(),
  } as unknown as {
    application: ApplicationStart;
    http: HttpSetup;
    share: SharePluginStart;
    uiSettings: IUiSettingsClient;
    settings: SettingsStart;
    theme: ThemeServiceStart;
  };

  beforeEach(() => {
    adapters = {
      foodapter: {
        foo() {
          return 42;
        },
      },
      bardapter: {},
    };

    views = [
      {
        title: 'View 1',
        order: 200,
        component: () => <h1>View 1</h1>,
      },
      {
        title: 'Foo View',
        order: 100,
        component: () => <h1>Foo view</h1>,
        shouldShow(adapters2: Adapters) {
          return adapters2.foodapter;
        },
      },
      {
        title: 'Never',
        order: 200,
        component: () => null,
        shouldShow() {
          return false;
        },
      },
    ];
  });

  it('should render title and default view correctly', () => {
    renderWithI18n(
      <InspectorPanel adapters={adapters} views={views} dependencies={dependencies} />
    );

    // Panel title
    expect(screen.getByRole('heading', { name: /Inspector/i })).toBeInTheDocument();

    // Selected view label in dropdown
    expect(screen.getByText('View: View 1')).toBeInTheDocument();

    // Rendered content of the selected view
    expect(screen.getByRole('heading', { name: 'View 1' })).toBeInTheDocument();
  });

  it('should not allow updating adapters', () => {
    const { rerender } = renderWithI18n(
      <InspectorPanel adapters={adapters} views={views} dependencies={dependencies} />
    );

    // Mutate adapters (simulate external change)
    adapters.notAllowed = {};

    expect(() =>
      rerender(<InspectorPanel adapters={adapters} views={views} dependencies={dependencies} />)
    ).toThrow();
  });

  describe('Import / Export view', () => {
    const snapshotDependencies = {
      ...dependencies,
      uiSettings: { get: () => 'UTC' },
    } as unknown as typeof dependencies;

    const renderPanel = (props: Partial<React.ComponentProps<typeof InspectorPanel>> = {}) =>
      renderWithI18n(
        <InspectorPanel
          adapters={adapters}
          views={views}
          dependencies={snapshotDependencies}
          {...props}
        />
      );

    const importedSnapshot = (createdAt: string): InspectorSnapshot => ({
      version: 1,
      meta: { kibanaVersion: '9.0.0', createdAt },
      requests: {},
    });

    const selectView = async (title: string) => {
      fireEvent.click(screen.getByTestId('inspectorViewChooser'));
      fireEvent.click(await screen.findByText(title));
    };

    const importFile = () => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, {
        target: { files: [new File(['{}'], 'snapshot.json', { type: 'application/json' })] },
      });
    };

    beforeEach(() => {
      adapters.requests = new RequestAdapter();
      jest.mocked(decodeSnapshot).mockReset();
      jest.mocked(downloadSnapshot).mockReset();
    });

    it('is listed in the view chooser and renders the snapshot panel', async () => {
      renderPanel();
      await selectView('Import / Export');

      expect(screen.getByText('View: Import / Export')).toBeInTheDocument();
      expect(screen.getByTestId('inspectorSnapshotPanel')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'View 1' })).not.toBeInTheDocument();
    });

    it('shows an error when the export fails', async () => {
      jest.mocked(downloadSnapshot).mockRejectedValue(new Error('boom'));
      renderPanel();
      await selectView('Import / Export');

      fireEvent.click(screen.getByTestId('inspectorSnapshotDownloadButton'));

      expect(await screen.findByText('Could not export snapshot: boom')).toBeInTheDocument();
    });

    it('clears the import error when switching to another view', async () => {
      jest.mocked(decodeSnapshot).mockRejectedValue(new Error('invalid file'));
      renderPanel();
      await selectView('Import / Export');

      importFile();
      expect(
        await screen.findByText('Could not import snapshot: invalid file')
      ).toBeInTheDocument();

      await selectView('View 1');
      expect(screen.queryByText(/Could not import snapshot/)).not.toBeInTheDocument();
    });

    it('shows the imported requests and leaves them when switching to another view', async () => {
      jest.mocked(decodeSnapshot).mockResolvedValue({
        version: 1,
        meta: {
          kibanaVersion: '9.0.0',
          createdAt: new Date().toISOString(),
          timezone: 'Europe/Vienna',
          browser: { name: 'Firefox', version: '132.0', os: 'Linux' },
        },
        requests: {},
      });
      renderPanel();
      await selectView('Import / Export');

      importFile();
      expect(await screen.findByText('Imported requests')).toBeInTheDocument();
      expect(screen.queryByTestId('inspectorSnapshotPanel')).not.toBeInTheDocument();
      expect(screen.getByText(/Exported with Firefox 132.0 on Linux/)).toBeInTheDocument();
      expect(screen.getByText('1 difference')).toBeInTheDocument();
      expect(screen.getByTestId('inspectorSnapshotEnvironment-timezone')).toHaveTextContent(
        'Europe/Vienna Current: UTC'
      );

      await selectView('Foo View');
      await waitFor(() => expect(screen.queryByText('Imported requests')).not.toBeInTheDocument());
      expect(screen.getByRole('heading', { name: 'Foo view' })).toBeInTheDocument();
    });

    it('is not listed without a requests adapter', async () => {
      delete adapters.requests;
      renderPanel();
      fireEvent.click(screen.getByTestId('inspectorViewChooser'));

      expect(await screen.findByText('Foo View')).toBeInTheDocument();
      expect(screen.queryByText('Import / Export')).not.toBeInTheDocument();
    });

    it('ignores an import that finishes after a newer one', async () => {
      let resolveFirst: (snapshot: InspectorSnapshot) => void = () => {};
      jest
        .mocked(decodeSnapshot)
        .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
        .mockResolvedValueOnce(importedSnapshot('2026-11-02T10:00:00.000Z'));
      renderPanel();
      await selectView('Import / Export');

      importFile();
      importFile();
      const callout = await screen.findByTestId('inspectorSnapshotCallout');
      const newerTitle = callout.textContent;

      resolveFirst(importedSnapshot('2020-01-01T00:00:00.000Z'));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(screen.getByTestId('inspectorSnapshotCallout').textContent).toBe(newerTitle);
    });

    it('marks live requests as restored data while the app replays a snapshot', async () => {
      renderPanel({
        snapshot: {
          appId: 'discover',
          getAppState: async () => ({}),
          replay: {
            kibanaVersion: '9.0.0',
            createdAt: '2026-11-02T10:00:00.000Z',
            timezone: 'Europe/Vienna',
          },
        },
      });

      expect(screen.getByTestId('inspectorSnapshotReplayNotice')).toHaveTextContent(
        'Restored data: Replaying snapshot from'
      );
      expect(screen.getByRole('heading', { name: 'View 1' })).toBeInTheDocument();
      expect(screen.getByTestId('inspectorSnapshotReplayEnvironment-timezone')).toHaveTextContent(
        'Europe/Vienna Current: UTC'
      );

      await selectView('Import / Export');
      expect(screen.getByTestId('inspectorSnapshotExportReplayNote')).toBeInTheDocument();
      expect(screen.queryByTestId('inspectorSnapshotReplayNotice')).not.toBeInTheDocument();
    });

    it('records the replayed snapshot in the export', async () => {
      const createdAt = '2026-11-02T10:00:00.000Z';
      renderPanel({
        snapshot: {
          appId: 'discover',
          getAppState: async () => ({}),
          replay: { kibanaVersion: '9.0.0', createdAt },
        },
      });
      await selectView('Import / Export');
      fireEvent.click(screen.getByTestId('inspectorSnapshotDownloadButton'));

      await waitFor(() => expect(downloadSnapshot).toHaveBeenCalled());
      expect(jest.mocked(downloadSnapshot).mock.calls[0][0].meta.restoredFrom).toEqual({
        createdAt,
        kibanaVersion: '9.0.0',
      });
    });
  });
});
