/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';

import { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { SearchSource } from '@kbn/data-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { LicenseCheckState } from '@kbn/licensing-plugin/public';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { ReportingAPIClient } from '../..';
import type { ClientConfigType } from '../../types';
import {
  ActionContext,
  type PanelActionDependencies,
  ReportingCsvPanelAction,
} from './get_csv_panel_action';

const core = coreMock.createSetup();
let apiClient: ReportingAPIClient;

describe('GetCsvReportPanelAction', () => {
  let csvConfig: ClientConfigType['csv'];
  let context: ActionContext;
  let mockLicenseState: LicenseCheckState;
  let mockSearchSource: SearchSource;
  let mockStartServicesPayload: [CoreStart, PanelActionDependencies, unknown];
  let mockStartServices$: Rx.Observable<typeof mockStartServicesPayload>;

  const mockLicense$ = () => {
    const license = licensingMock.createLicense();
    license.check = jest.fn(() => ({
      message: `check-foo state: ${mockLicenseState}`,
      state: mockLicenseState,
    }));
    return new Rx.BehaviorSubject(license);
  };

  beforeAll(() => {
    if (typeof window.URL.revokeObjectURL === 'undefined') {
      Object.defineProperty(window.URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: () => {},
      });
    }

    core.http.post.mockResolvedValue({
      job: { id: 'mock-job-id', payload: { objectType: 'search' } },
    });
  });

  beforeEach(() => {
    csvConfig = {
      scroll: {} as ClientConfigType['csv']['scroll'],
      enablePanelActionDownload: false,
    };

    apiClient = new ReportingAPIClient(core.http, core.uiSettings, '7.15.0');
    jest.spyOn(apiClient, 'createReportingJob');

    mockLicenseState = 'valid';

    mockStartServicesPayload = [
      {
        ...core,
        application: { capabilities: { dashboard: { downloadCsv: true } } },
      } as unknown as CoreStart,
      {
        data: dataPluginMock.createStartContract(),
        licensing: { ...licensingMock.createStart(), license$: mockLicense$() },
      } as unknown as PanelActionDependencies,
      null,
    ];
    mockStartServices$ = Rx.from(Promise.resolve(mockStartServicesPayload));

    mockSearchSource = {
      createCopy: () => mockSearchSource,
      removeField: jest.fn(),
      setField: jest.fn(),
      getField: jest.fn(),
      getSerializedFields: jest.fn().mockImplementation(() => ({})),
    } as unknown as SearchSource;

    context = {
      embeddable: {
        type: 'search',
        getSavedSearch: () => {
          return { searchSource: mockSearchSource };
        },
        getTitle: () => `The Dude`,
        getInspectorAdapters: () => null,
        getInput: () => ({
          viewMode: 'list',
          timeRange: {
            to: 'now',
            from: 'now-7d',
          },
        }),
        hasTimeRange: () => true,
      },
    } as unknown as ActionContext;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('translates empty embeddable context into job params', async () => {
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
      csvConfig,
    });

    await Rx.firstValueFrom(mockStartServices$);

    await panel.execute(context);

    expect(apiClient.createReportingJob).toHaveBeenCalledWith('csv_searchsource', {
      browserTimezone: undefined,
      columns: [],
      objectType: 'search',
      searchSource: {},
      title: '',
      version: '7.15.0',
    });
  });

  it('translates embeddable context into job params', async () => {
    mockSearchSource = {
      createCopy: () => mockSearchSource,
      removeField: jest.fn(),
      setField: jest.fn(),
      getField: jest.fn((name) => (name === 'index' ? dataViewMock : undefined)),
      getSerializedFields: jest.fn().mockImplementation(() => ({ testData: 'testDataValue' })),
    } as unknown as SearchSource;
    context.embeddable.getSavedSearch = () => {
      return {
        searchSource: mockSearchSource,
        columns: ['column_a', 'column_b'],
      } as unknown as SavedSearch;
    };

    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
      csvConfig,
    });

    await Rx.firstValueFrom(mockStartServices$);

    await panel.execute(context);

    expect(apiClient.createReportingJob).toHaveBeenCalledWith('csv_searchsource', {
      browserTimezone: undefined,
      columns: ['column_a', 'column_b'],
      objectType: 'search',
      searchSource: { testData: 'testDataValue' },
      title: '',
      version: '7.15.0',
    });
  });

  it('allows csv generation for valid licenses', async () => {
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
      csvConfig,
    });

    await Rx.firstValueFrom(mockStartServices$);

    await panel.execute(context);

    expect(core.http.post).toHaveBeenCalledWith('/internal/reporting/generate/csv_searchsource', {
      body: '{"jobParams":"(columns:!(),objectType:search,searchSource:(),title:\'\',version:\'7.15.0\')"}',
      method: 'POST',
    });
  });

  it('shows a toast when it unsuccessfully fails', async () => {
    apiClient.createReportingJob = jest.fn().mockRejectedValue('No more ram!');
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
      csvConfig,
    });

    await Rx.firstValueFrom(mockStartServices$);

    await panel.execute(context);

    expect(core.notifications.toasts.addDanger).toHaveBeenCalledWith({
      'data-test-subj': 'generateCsvFail',
      text: "We couldn't generate your CSV at this time.",
      title: 'CSV report failed',
    });
  });

  it(`doesn't allow csv generation with bad licenses`, async () => {
    mockLicenseState = 'invalid';

    const plugin = new ReportingCsvPanelAction({
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
      csvConfig,
    });

    await Rx.firstValueFrom(mockStartServices$);
    expect(await plugin.isCompatible(context)).toEqual(false);
  });

  it('sets a display and icon type', async () => {
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
      csvConfig,
    });

    await Rx.firstValueFrom(mockStartServices$);

    expect(panel.getIconType()).toBe('document');
    expect(panel.getDisplayName()).toBe('Generate CSV report');
  });

  describe('Application UI Capabilities', () => {
    it(`doesn't allow csv generation when UI capability is not enabled`, async () => {
      mockStartServicesPayload[0].application = { capabilities: {} } as CoreStart['application'];
      const plugin = new ReportingCsvPanelAction({
        core,
        apiClient,
        startServices$: mockStartServices$,
        usesUiCapabilities: true,
        csvConfig,
      });

      await Rx.firstValueFrom(mockStartServices$);

      expect(await plugin.isCompatible(context)).toEqual(false);
    });

    it(`allows csv generation when license is valid and UI capability is enabled`, async () => {
      const plugin = new ReportingCsvPanelAction({
        core,
        apiClient,
        startServices$: mockStartServices$,
        usesUiCapabilities: true,
        csvConfig,
      });

      await Rx.firstValueFrom(mockStartServices$);

      expect(await plugin.isCompatible(context)).toEqual(true);
    });

    it(`allows csv generation when license is valid and deprecated roles config is enabled`, async () => {
      const plugin = new ReportingCsvPanelAction({
        core,
        apiClient,
        startServices$: mockStartServices$,
        usesUiCapabilities: false,
        csvConfig,
      });

      expect(await plugin.isCompatible(context)).toEqual(true);
    });
  });

  describe('download csv', () => {
    beforeEach(() => {
      csvConfig = {
        scroll: {} as ClientConfigType['csv']['scroll'],
        enablePanelActionDownload: true,
      };

      core.http.post.mockResolvedValue({});
    });

    it('shows a success toast when the download successfully starts', async () => {
      const panel = new ReportingCsvPanelAction({
        core,
        apiClient,
        startServices$: mockStartServices$,
        usesUiCapabilities: true,
        csvConfig,
      });

      await Rx.firstValueFrom(mockStartServices$);

      await panel.execute(context);

      expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        'data-test-subj': 'csvDownloadStarted',
        text: expect.any(Function),
        title: 'CSV download started',
      });
      expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
    });

    it('shows a bad old toastie when it unsuccessfully fails', async () => {
      apiClient.createImmediateReport = jest.fn().mockRejectedValue('No more ram!');
      const panel = new ReportingCsvPanelAction({
        core,
        apiClient,
        startServices$: mockStartServices$,
        usesUiCapabilities: true,
        csvConfig,
      });

      await Rx.firstValueFrom(mockStartServices$);

      await panel.execute(context);

      expect(core.notifications.toasts.addSuccess).toHaveBeenCalled();
      expect(core.notifications.toasts.addDanger).toHaveBeenCalledWith({
        'data-test-subj': 'downloadCsvFail',
        text: "We couldn't download your CSV at this time.",
        title: 'CSV download failed',
      });
    });
  });
});
