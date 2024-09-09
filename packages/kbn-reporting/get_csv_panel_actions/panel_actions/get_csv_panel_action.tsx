/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, Observable } from 'rxjs';

import {
  AnalyticsServiceStart,
  CoreSetup,
  CoreStart,
  I18nStart,
  NotificationsSetup,
  ThemeServiceSetup,
} from '@kbn/core/public';
import { DataPublicPluginStart, SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import {
  loadSharingDataHelpers,
  SEARCH_EMBEDDABLE_TYPE,
  apiPublishesSavedSearch,
  PublishesSavedSearch,
  HasTimeRange,
} from '@kbn/discover-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import {
  apiCanAccessViewMode,
  apiHasType,
  apiIsOfType,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  HasType,
} from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { CSV_REPORTING_ACTION, JobAppParamsCSV } from '@kbn/reporting-export-types-csv-common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ClientConfigType } from '@kbn/reporting-public/types';
import { checkLicense } from '@kbn/reporting-public/license_check';
import type { ReportingAPIClient } from '@kbn/reporting-public/reporting_api_client';

import { getI18nStrings } from './strings';

export interface PanelActionDependencies {
  data: DataPublicPluginStart;
  licensing: LicensingPluginStart;
}

type StartServices = [
  Pick<
    CoreStart,
    // required for modules that render React
    | 'analytics'
    | 'i18n'
    | 'theme'
    // used extensively in Reporting share panel action
    | 'application'
    | 'uiSettings'
  >,
  PanelActionDependencies,
  unknown
];

interface Params {
  apiClient: ReportingAPIClient;
  csvConfig: ClientConfigType['csv'];
  core: CoreSetup;
  startServices$: Observable<StartServices>;
  usesUiCapabilities: boolean;
}

interface ExecutionParams {
  searchSource: SerializedSearchSourceFields;
  columns: string[] | undefined;
  title: string;
  analytics: AnalyticsServiceStart;
  i18nStart: I18nStart;
}

type GetCsvActionApi = HasType & PublishesSavedSearch & CanAccessViewMode & HasTimeRange;

const compatibilityCheck = (api: EmbeddableApiContext['embeddable']): api is GetCsvActionApi => {
  return (
    apiHasType(api) &&
    apiIsOfType(api, SEARCH_EMBEDDABLE_TYPE) &&
    apiPublishesSavedSearch(api) &&
    apiCanAccessViewMode(api) &&
    Boolean((api as unknown as HasTimeRange).hasTimeRange)
  );
};

export class ReportingCsvPanelAction implements ActionDefinition<EmbeddableApiContext> {
  private isDownloading: boolean;
  public readonly type = '';
  public readonly id = CSV_REPORTING_ACTION;
  private readonly i18nStrings: ReturnType<typeof getI18nStrings>;
  private readonly notifications: NotificationsSetup;
  private readonly apiClient: ReportingAPIClient;
  private readonly enablePanelActionDownload: boolean;
  private readonly theme: ThemeServiceSetup;
  private readonly startServices$: Params['startServices$'];
  private readonly usesUiCapabilities: boolean;

  constructor({ core, csvConfig, apiClient, startServices$, usesUiCapabilities }: Params) {
    this.isDownloading = false;
    this.apiClient = apiClient;
    this.enablePanelActionDownload = csvConfig.enablePanelActionDownload === true;
    this.notifications = core.notifications;
    this.theme = core.theme;
    this.startServices$ = startServices$;
    this.usesUiCapabilities = usesUiCapabilities;
    this.i18nStrings = getI18nStrings(apiClient);
  }

  public getIconType() {
    return 'document';
  }

  public getDisplayName() {
    return this.enablePanelActionDownload
      ? this.i18nStrings.download.displayName
      : this.i18nStrings.generate.displayName;
  }

  public async getSharingData(savedSearch: SavedSearch) {
    const [{ uiSettings }, { data }] = await firstValueFrom(this.startServices$);
    const { getSharingData } = await loadSharingDataHelpers();
    return await getSharingData(savedSearch.searchSource, savedSearch, { uiSettings, data });
  }

  public isCompatible = async (context: EmbeddableApiContext) => {
    const { embeddable } = context;

    if (!compatibilityCheck(embeddable)) {
      return false;
    }

    const [{ application }, { licensing }] = await firstValueFrom(this.startServices$);
    const license = await firstValueFrom(licensing.license$);
    const licenseHasCsvReporting = checkLicense(license.check('reporting', 'basic')).showLinks;

    // NOTE: For historical reasons capability identifier is called `downloadCsv. It can not be renamed.
    const capabilityHasCsvReporting = this.usesUiCapabilities
      ? application.capabilities.dashboard?.downloadCsv === true
      : true; // if we're using the deprecated "xpack.reporting.roles.enabled=true" setting, the panel action is always visible

    if (!licenseHasCsvReporting || !capabilityHasCsvReporting) {
      return false;
    }

    return getInheritedViewMode(embeddable) !== ViewMode.EDIT;
  };

  /**
   * Requires `xpack.reporting.csv.enablePanelActionDownload: true` in kibana.yml
   * @deprecated
   */
  private executeDownload = async (params: ExecutionParams) => {
    const { searchSource, columns, title, analytics, i18nStart } = params;
    const immediateJobParams = this.apiClient.getDecoratedJobParams({
      searchSource,
      columns,
      title,
      objectType: 'downloadCsv', // FIXME: added for typescript, but immediate download job does not need objectType
    });

    this.isDownloading = true;

    this.notifications.toasts.addSuccess({
      title: this.i18nStrings.download.toasts.success.title,
      text: toMountPoint(this.i18nStrings.download.toasts.success.body, {
        analytics,
        i18n: i18nStart,
        theme: this.theme,
      }),
      'data-test-subj': 'csvDownloadStarted',
    });

    await this.apiClient
      .createImmediateReport(immediateJobParams)
      .then(({ body, response }) => {
        this.isDownloading = false;

        const download = `${title}.csv`;
        const blob = new Blob([body as BlobPart], {
          type: response?.headers.get('content-type') || undefined,
        });

        // Hack for IE11 Support
        // @ts-expect-error
        if (window.navigator.msSaveOrOpenBlob) {
          // @ts-expect-error
          return window.navigator.msSaveOrOpenBlob(blob, download);
        }

        const a = window.document.createElement('a');
        const downloadObject = window.URL.createObjectURL(blob);

        a.href = downloadObject;
        a.download = download;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadObject);
        document.body.removeChild(a);
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(error);
        this.isDownloading = false;
        this.notifications.toasts.addDanger({
          title: this.i18nStrings.download.toasts.error.title,
          text: this.i18nStrings.download.toasts.error.body,
          'data-test-subj': 'downloadCsvFail',
        });
      });
  };

  private executeGenerate = async (params: ExecutionParams) => {
    const { searchSource, columns, title, analytics, i18nStart } = params;
    const csvJobParams = this.apiClient.getDecoratedJobParams<JobAppParamsCSV>({
      searchSource,
      columns,
      title,
      objectType: 'search',
    });

    await this.apiClient
      .createReportingJob('csv_searchsource', csvJobParams)
      .then((job) => {
        if (job) {
          this.notifications.toasts.addSuccess({
            title: this.i18nStrings.generate.toasts.success.title,
            text: toMountPoint(this.i18nStrings.generate.toasts.success.body, {
              analytics,
              i18n: i18nStart,
              theme: this.theme,
            }),
            'data-test-subj': 'csvReportStarted',
          });
        }
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(error);
        this.notifications.toasts.addDanger({
          title: this.i18nStrings.generate.toasts.error.title,
          text: this.i18nStrings.generate.toasts.error.body,
          'data-test-subj': 'generateCsvFail',
        });
      });
  };

  public execute = async (context: EmbeddableApiContext) => {
    const { embeddable } = context;

    if (!compatibilityCheck(embeddable) || !(await this.isCompatible(context))) {
      throw new IncompatibleActionError();
    }

    const savedSearch = embeddable.savedSearch$.getValue();

    if (!savedSearch || this.isDownloading) {
      return;
    }

    const [{ i18n: i18nStart, analytics }] = await firstValueFrom(this.startServices$);
    const { columns, getSearchSource } = await this.getSharingData(savedSearch);
    const searchSource = getSearchSource({
      addGlobalTimeFilter: !embeddable.hasTimeRange(),
      absoluteTime: true,
    });
    const title = savedSearch.title || '';
    const executionParams = { searchSource, columns, title, savedSearch, i18nStart, analytics };

    if (this.enablePanelActionDownload) {
      return this.executeDownload(executionParams);
    }
    return this.executeGenerate(executionParams);
  };
}
