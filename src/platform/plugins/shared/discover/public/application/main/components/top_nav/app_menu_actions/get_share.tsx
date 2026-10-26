/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AppMenuActionId, type DiscoverAppMenuItemType } from '@kbn/discover-utils';
import type { AppHeaderShareAction } from '@kbn/app-header';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { i18n } from '@kbn/i18n';
import { isOfAggregateQueryType, type TimeRange } from '@kbn/es-query';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { ShowShareMenuOptions } from '@kbn/share-plugin/public';
import type { SharingData } from '@kbn/share-plugin/public/types';
import type { ReportingCSVSharingData } from '@kbn/reporting-public/types';
import type { DataTotalHitsMsg } from '../../../state_management/discover_data_state_container';
import {
  getColumnsWithTimeField,
  getSharingData,
  showPublicUrlSwitch,
} from '../../../../../utils/get_sharing_data';
import { createSearchSource } from '../../../state_management/utils/create_search_source';
import { getDiscoverLocatorParams } from '../../../utils/get_discover_locator_params';
import {
  getExpandedDocLinkability,
  getExpandedDocLinkDisabledReason,
} from '../../../utils/expanded_doc';
import type { DiscoverAppLocatorParams } from '../../../../../../common/app_locator';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';
import {
  selectCurrentProfileLocatorState,
  type RuntimeStateManager,
  type TabState,
} from '../../../state_management/redux';

interface BuildShareOptionsParams {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  currentTab: TabState;
  runtimeStateManager: RuntimeStateManager;
  persistedDiscoverSession: DiscoverSession | undefined;
  totalHitsState: DataTotalHitsMsg;
  hasUnsavedChanges: boolean;
}

/**
 * Specifies an explicit type for the sharing data of the Discover app.
 */
type DiscoverSharingData = SharingData<DiscoverAppLocatorParams> & ReportingCSVSharingData;

/** Explains limitations when sharing an open document. */
const getExpandedDocHelpText = ({
  currentTab,
  timeRange,
}: {
  currentTab: TabState;
  timeRange: TimeRange | undefined;
}) => {
  if (!currentTab.expandedDoc) {
    return undefined;
  }

  const isEsqlMode = isOfAggregateQueryType(currentTab.appState.query);
  const disabledReason = getExpandedDocLinkDisabledReason(
    getExpandedDocLinkability(currentTab.appState.query, currentTab.expandedDoc)
  );

  // A non-linkable document takes precedence over the relative-time warning.
  if (disabledReason) {
    return (
      <KbnInfoCallout
        data-test-subj="discoverShareExpandedDocCallout"
        title={
          isEsqlMode
            ? i18n.translate('discover.share.expandedResultNotLinkableTitle', {
                defaultMessage: "This link won't include the open result",
              })
            : i18n.translate('discover.share.expandedDocumentNotLinkableTitle', {
                defaultMessage: "This link won't include the open document",
              })
        }
        text={disabledReason}
      />
    );
  }

  // Relative time may exclude the document from the recipient's results and lose its context.
  const isTimeRangeAbsolute = !(timeRange?.from?.includes('now') || timeRange?.to?.includes('now'));
  if (isTimeRangeAbsolute) {
    return undefined;
  }

  return (
    <KbnInfoCallout
      data-test-subj="discoverShareExpandedDocCallout"
      title={
        isEsqlMode
          ? i18n.translate('discover.share.expandedResultRelativeTimeTitle', {
              defaultMessage: 'This link includes an open result',
            })
          : i18n.translate('discover.share.expandedDocumentRelativeTimeTitle', {
              defaultMessage: 'This link includes an open document',
            })
      }
      text={i18n.translate('discover.share.expandedDocRelativeTimeDescription', {
        defaultMessage:
          'Use an absolute time range so it stays in the results when the link is opened.',
      })}
    />
  );
};

/**
 * Builds share options for both share modal and export integrations
 */
export const buildShareOptions = async ({
  discoverParams,
  services,
  currentTab,
  runtimeStateManager,
  persistedDiscoverSession,
  totalHitsState,
  hasUnsavedChanges,
}: BuildShareOptionsParams): Promise<
  Omit<
    ShowShareMenuOptions<DiscoverAppLocatorParams, ReportingCSVSharingData>,
    'anchorElement' | 'asExport'
  >
> => {
  const { dataView, isEsqlMode } = discoverParams;

  const searchSource = createSearchSource({
    dataView,
    appState: currentTab.appState,
    globalState: currentTab.globalState,
    services,
  });

  const { locator } = services;
  const { timefilter } = services.data.query.timefilter;
  const timeRange = timefilter.getTime();
  // Use the absolute time range captured at the most recent on-screen fetch so the export
  // covers the exact window the user saw, rather than re-resolving "now" at click time.
  const absoluteTimeRange =
    currentTab.dataRequestParams.timeRangeAbsolute ?? timefilter.getAbsoluteTime();
  const refreshInterval = timefilter.getRefreshInterval();

  const searchSourceSharingData = await getSharingData(
    searchSource,
    currentTab.appState,
    services,
    absoluteTimeRange
  );
  const filters = services.filterManager.getFilters();
  const profileState = selectCurrentProfileLocatorState({
    runtimeStateManager,
    tabId: currentTab.id,
    profileStateMap: currentTab.profileState,
    profileStateRegistry: services.profileStateRegistry,
  });

  // Share -> Get links -> Snapshot
  const params: DiscoverSharingData['locatorParams'][number]['params'] = getDiscoverLocatorParams({
    currentTab,
    dataView,
    persistedDiscoverSession,
    filters,
    timeRange,
    refreshInterval,
    profileState,
  });

  const relativeUrl = locator.getRedirectUrl(params);

  // This logic is duplicated from `relativeToAbsolute` (for bundle size reasons). Ultimately, this should be
  // replaced when https://github.com/elastic/kibana/issues/153323 is implemented.
  const link = document.createElement('a');
  link.setAttribute('href', relativeUrl);
  const shareableUrl = link.href;

  // Share -> Get links -> Saved object
  let shareableUrlForSavedObject = await locator.getUrl(
    { savedSearchId: persistedDiscoverSession?.id },
    { absolute: true }
  );

  // UrlPanelContent forces a '_g' parameter in the saved object URL:
  // https://github.com/elastic/kibana/blob/a30508153c1467b1968fb94faf1debc5407f61ea/src/plugins/share/public/components/url_panel_content.tsx#L230
  // Since our locator doesn't add the '_g' parameter if it's not needed, UrlPanelContent
  // will interpret it as undefined and add '?_g=' to the URL, which is invalid in Discover,
  // so instead we add an empty object for the '_g' parameter to the URL.
  shareableUrlForSavedObject = setStateToKbnUrl('_g', {}, undefined, shareableUrlForSavedObject);

  return {
    allowShortUrl: !!services.capabilities.discover_v2.createShortUrl,
    shareableUrl,
    shareableUrlForSavedObject,
    // Share URL gets the unmodified `columns` array (without the automatically added time field)
    // so it does not trigger the unsaved changes badge when user opens the link
    shareableUrlLocatorParams: { locator, params },
    objectId: persistedDiscoverSession?.id,
    objectType: 'search',
    objectTypeAlias: i18n.translate('discover.share.objectTypeAlias', {
      defaultMessage: 'Discover session',
    }),
    objectTypeMeta: {
      title: i18n.translate('discover.share.shareModal.title', {
        defaultMessage: 'Share this Discover session',
      }),
      config: {
        embed: {
          disabled: true,
          showPublicUrlSwitch,
        },
        integration: {
          export: {
            csvReports: {
              draftModeCallOut: true,
            },
          },
        },
        link: {
          draftModeCallOut: true,
          helpText: getExpandedDocHelpText({ currentTab, timeRange }),
        },
      },
    },
    sharingData: {
      isTextBased: isEsqlMode,
      locatorParams: [
        {
          id: locator.id,
          version: services.metadata.version,
          params: isEsqlMode
            ? {
                ...params,
                // in ES|QL mode this `columns` array will be used when generating CSV on Discover page (CSV v2)
                // this way the time field will be included only for CSV export and not for Share URL
                columns: getColumnsWithTimeField({
                  columns: (params.columns as string[]) || [],
                  timeFieldName: dataView?.timeFieldName,
                  uiSettings: services.uiSettings,
                  query: currentTab.appState.query,
                }),
                // Resolved variable values so the reporting server can bind named params (e.g. ?crew_id).
                ...(currentTab.esqlVariables?.length
                  ? { esqlVariables: currentTab.esqlVariables }
                  : {}),
              }
            : params,
        },
      ],
      ...searchSourceSharingData,
      // CSV reports can be generated without a saved search so we provide a fallback title
      title:
        persistedDiscoverSession?.title ||
        i18n.translate('discover.localMenu.fallbackReportTitle', {
          defaultMessage: 'Untitled Discover session',
        }),
      totalHits: totalHitsState.result || 0,
      absoluteTimeRange: isEsqlMode ? absoluteTimeRange : undefined, // used by ES|QL immediate export via toAbsoluteTimeRange
    },
    isDirty: !persistedDiscoverSession?.id || hasUnsavedChanges,
  };
};

export const getShareAppMenuItem = ({
  shareAction,
}: {
  shareAction?: AppHeaderShareAction;
}): DiscoverAppMenuItemType | undefined => {
  if (!shareAction) {
    return undefined;
  }

  return {
    id: AppMenuActionId.share,
    order: 1,
    label: i18n.translate('discover.localMenu.shareTitle', {
      defaultMessage: 'Share',
    }),
    tooltipContent:
      shareAction.tooltip?.content ??
      i18n.translate('discover.localMenu.shareTooltip', {
        defaultMessage: 'Share session',
      }),
    tooltipTitle: shareAction.tooltip?.title,
    iconType: 'share',
    testId: 'shareTopNavButton',
    disableButton: shareAction.isDisabled,
    run: (params) => {
      void shareAction.onClick({
        returnFocus: params?.returnFocus ?? (() => params?.triggerElement?.focus()),
      });
    },
  };
};
