/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { ISessionService } from '@kbn/data-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { QueryInputServices } from '@kbn/visualization-ui-components';
import type { EmbeddableComponent as LensEmbeddableComponent } from '@kbn/lens-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { TableListTabParentProps } from '@kbn/content-management-tabbed-table-list-view';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-components';
import type { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import { GroupEditorFlyout } from './group_editor_flyout';
import { useNavigateToLens } from './use_navigate_to_lens';
import { useSearchSession } from './use_search_session';
import { EventAnnotationListing } from './annotation_listing';
import { EventAnnotationListingProvider } from './annotation_listing_provider';
import { createDataViewFilterDefinition, createDataViewSortField } from './data_view_filter';

/**
 * The bundle of plugin services and start contracts that the listing page
 * needs in order to render. Built once by the plugin's `getTableList` tab
 * callback and handed in as a single prop, so callers don't have to enumerate
 * each individual capability at the JSX boundary.
 */
export interface EventAnnotationListingPageServices {
  core: CoreStart;
  savedObjectsTagging: SavedObjectsTaggingApi;
  eventAnnotationService: EventAnnotationServiceType;
  dataViews: DataView[];
  createDataView: (spec: DataViewSpec) => Promise<DataView>;
  queryInputServices: QueryInputServices;
  LensEmbeddableComponent: LensEmbeddableComponent;
  sessionService: ISessionService;
  embeddable: EmbeddableStart;
}

export interface EventAnnotationListingPageProps {
  services: EventAnnotationListingPageServices;
  parentProps: TableListTabParentProps;
}

/**
 * Page-level orchestration for the annotation-groups listing tab. Owns the
 * `ContentListClientProvider`, the editor flyout state, the search session
 * lifecycle, the navigate-to-Lens flow, and the action handlers wired to the
 * provider's `item` / `features` config. Renders the pure
 * `EventAnnotationListing` composition as its child.
 */
export const EventAnnotationListingPage = ({
  services: {
    core,
    savedObjectsTagging,
    eventAnnotationService,
    dataViews,
    createDataView,
    queryInputServices,
    LensEmbeddableComponent,
    sessionService,
    embeddable,
  },
  parentProps,
}: EventAnnotationListingPageProps) => {
  const visualizeCapabilities = core.application.capabilities.visualize_v2;
  const canSave = visualizeCapabilities.save === true;
  const canDelete = visualizeCapabilities.delete === true;

  const { onFetchSuccess, setPageDataTestSubject } = parentProps;

  // The legacy `TableListViewTable` set this to ``${entityName}LandingPage``
  // (rendered as `'annotation groupLandingPage'`, locale-dependent). Nothing in
  // tree consumed it, so we replace it with a stable, locale-independent hook
  // for future FTR/Scout fixtures.
  useEffect(() => {
    setPageDataTestSubject(`eventAnnotationLandingPage`);
  }, [setPageDataTestSubject]);

  const onCreateAnnotation = useNavigateToLens({ core, embeddable });
  const { searchSessionId, refreshSearchSession } = useSearchSession(sessionService);

  const dataViewNameMap = useMemo(
    () => Object.fromEntries(dataViews.map((dv) => [dv.id, dv.name ?? dv.title])),
    [dataViews]
  );
  const dataViewFilter = useMemo(
    () => createDataViewFilterDefinition(dataViewNameMap),
    [dataViewNameMap]
  );
  const dataViewSort = useMemo(() => createDataViewSortField(dataViewFilter), [dataViewFilter]);

  // Bumping `refreshSignal` re-keys `ContentListClientProvider` after a
  // `GroupEditorFlyout` save so the list refetches with a fresh React Query
  // cache. Inline content-editor saves go through the provider's own
  // `onInvalidate` path, so they don't need this signal.
  const [refreshSignal, setRefreshSignal] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshSignal((prev) => prev + 1), []);

  const [groupToEditInfo, setGroupToEditInfo] = useState<{
    group: EventAnnotationGroupConfig;
    id: string;
  }>();

  const timePickerQuickRanges = core.uiSettings.get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES);

  const closeFlyout = useCallback(() => setGroupToEditInfo(undefined), []);

  const saveFlyout = useCallback(() => {
    if (!groupToEditInfo) {
      return;
    }
    return eventAnnotationService
      .updateAnnotationGroup(groupToEditInfo.group, groupToEditInfo.id)
      .then(() => {
        setGroupToEditInfo(undefined);
        triggerRefresh();
      });
  }, [eventAnnotationService, groupToEditInfo, triggerRefresh]);

  const updateGroup = useCallback(
    (newGroup: EventAnnotationGroupConfig) => {
      if (!groupToEditInfo) {
        return;
      }
      setGroupToEditInfo({ group: newGroup, id: groupToEditInfo.id });
    },
    [groupToEditInfo]
  );

  return (
    <EventAnnotationListingProvider
      {...{
        canDelete,
        canSave,
        core,
        dataViewFilter,
        dataViewSort,
        eventAnnotationService,
        onEditGroup: setGroupToEditInfo,
        onFetchSuccess,
        refreshSignal,
        savedObjectsTagging,
      }}
    >
      <EventAnnotationListing {...{ onCreateAnnotation, dataViewNameMap }} />
      {groupToEditInfo ? (
        <GroupEditorFlyout
          group={groupToEditInfo.group}
          {...{
            onClose: closeFlyout,
            onSave: saveFlyout,
            updateGroup,
            savedObjectsTagging,
            dataViews,
            createDataView,
            LensEmbeddableComponent,
            queryInputServices,
            searchSessionId,
            refreshSearchSession,
            timePickerQuickRanges,
          }}
        />
      ) : null}
    </EventAnnotationListingProvider>
  );
};
