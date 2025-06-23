/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, Observable } from 'rxjs';

import { CoreSetup, CoreStart, NotificationsSetup } from '@kbn/core/public';
import { DataPublicPluginStart, type SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import {
  loadSharingDataHelpers,
  SEARCH_EMBEDDABLE_TYPE,
  apiPublishesSavedSearch,
  PublishesSavedSearch,
  HasTimeRange,
} from '@kbn/discover-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { DISCOVER_APP_LOCATOR, type DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import {
  apiCanAccessViewMode,
  apiHasType,
  apiIsOfType,
  apiPublishesTitle,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  HasType,
  type PublishesSavedObjectId,
  PublishesTitle,
  type PublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { CSV_REPORTING_ACTION } from '@kbn/reporting-export-types-csv-common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ClientConfigType } from '@kbn/reporting-public/types';
import { checkLicense } from '@kbn/reporting-public/license_check';
import {
  getSearchCsvJobParams,
  CsvSearchModeParams,
} from '@kbn/reporting-public/share/shared/get_search_csv_job_params';
import type { ReportingAPIClient } from '@kbn/reporting-public/reporting_api_client';
import { LocatorParams } from '@kbn/reporting-common/types';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getI18nStrings } from './strings';

export interface PanelActionDependencies {
  data: DataPublicPluginStart;
  licensing: LicensingPluginStart;
}

type StartServices = [
  Pick<
    CoreStart,
    // required for modules that render React
    | 'rendering'
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
}

interface ExecutionParams {
  searchModeParams: CsvSearchModeParams;
  title: string;
}

type GetCsvActionApi = HasType &
  PublishesSavedSearch &
  CanAccessViewMode &
  HasTimeRange &
  PublishesTitle;

const compatibilityCheck = (api: EmbeddableApiContext['embeddable']): api is GetCsvActionApi => {
  return (
    apiHasType(api) &&
    apiIsOfType(api, SEARCH_EMBEDDABLE_TYPE) &&
    apiPublishesSavedSearch(api) &&
    apiCanAccessViewMode(api) &&
    Boolean((api as unknown as HasTimeRange).hasTimeRange) &&
    apiPublishesTitle(api)
  );
};

export class ReportingCsvPanelAction implements ActionDefinition<EmbeddableApiContext> {
  private isDownloading: boolean;
  public readonly type = '';
  public readonly id = CSV_REPORTING_ACTION;
  private readonly i18nStrings: ReturnType<typeof getI18nStrings>;
  private readonly notifications: NotificationsSetup;
  private readonly apiClient: ReportingAPIClient;
  private readonly startServices$: Observable<StartServices>;

  constructor({ core, apiClient, startServices$ }: Params) {
    this.isDownloading = false;
    this.apiClient = apiClient;
    this.notifications = core.notifications;
    this.startServices$ = startServices$;
    this.i18nStrings = getI18nStrings(apiClient);
  }

  public getIconType() {
    return 'document';
  }

  public getDisplayName() {
    return this.i18nStrings.generate.displayName;
  }

  public async getSharingData(savedSearch: SavedSearch) {
    const [{ uiSettings }, { data }] = await firstValueFrom(this.startServices$);
    const { getSharingData } = await loadSharingDataHelpers();
    return await getSharingData(
      savedSearch.searchSource,
      savedSearch,
      { uiSettings, data },
      this.isEsqlMode(savedSearch)
    );
  }

  private isEsqlMode(savedSearch: SavedSearch) {
    return isOfAggregateQueryType(savedSearch.searchSource.getField('query'));
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
    const capabilityHasCsvReporting = application.capabilities.dashboard_v2?.downloadCsv === true;
    if (!licenseHasCsvReporting || !capabilityHasCsvReporting) {
      return false;
    }

    return getInheritedViewMode(embeddable) !== 'edit';
  };

  private executeGenerate = async (params: ExecutionParams) => {
    const [{ rendering }] = await firstValueFrom(this.startServices$);
    const { searchModeParams, title } = params;
    const { reportType, decoratedJobParams } = getSearchCsvJobParams({
      apiClient: this.apiClient,
      searchModeParams,
      title,
    });

    await this.apiClient
      .createReportingJob(reportType, decoratedJobParams)
      .then((job) => {
        if (job) {
          this.notifications.toasts.addSuccess({
            title: this.i18nStrings.generate.toasts.success.title,
            text: toMountPoint(this.i18nStrings.generate.toasts.success.body, rendering),
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

  private getDiscoverLocatorParamsForEsqlCSV = (
    api: PublishesSavedSearch & Partial<PublishesSavedObjectId & PublishesUnifiedSearch>,
    searchSourceFields: SerializedSearchSourceFields,
    columns: string[]
  ): DiscoverAppLocatorParams => {
    const savedObjectId = api.savedObjectId$?.getValue();

    return {
      ...(savedObjectId ? { savedSearchId: savedObjectId } : {}),
      query: searchSourceFields.query,
      filters: searchSourceFields.parent?.filter, // time range filter
      columns,
    };
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

    const title = embeddable.title$.getValue() ?? '';

    const { columns, getSearchSource } = await this.getSharingData(savedSearch);
    const searchSource = getSearchSource({
      addGlobalTimeFilter: !embeddable.hasTimeRange(),
      absoluteTime: true,
    });

    if (this.isEsqlMode(savedSearch)) {
      return this.executeGenerate({
        title,
        searchModeParams: {
          isEsqlMode: true,
          locatorParams: [
            {
              id: DISCOVER_APP_LOCATOR,
              params: this.getDiscoverLocatorParamsForEsqlCSV(embeddable, searchSource, columns),
            } as LocatorParams,
          ],
        },
      });
    }

    return this.executeGenerate({
      title,
      searchModeParams: { isEsqlMode: false, searchSource, columns },
    });
  };
}
