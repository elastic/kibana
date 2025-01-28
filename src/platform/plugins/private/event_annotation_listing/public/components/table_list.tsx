/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { TableListViewTable } from '@kbn/content-management-table-list-view-table';
import type { TableListTabParentProps } from '@kbn/content-management-tabbed-table-list-view';
import { i18n } from '@kbn/i18n';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { SavedObjectsFindOptionsReference } from '@kbn/core-saved-objects-api-browser';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { QueryInputServices } from '@kbn/visualization-ui-components';
import { IToasts } from '@kbn/core-notifications-browser';
import { EuiButton, EuiEmptyPrompt, EuiIcon, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EmbeddableComponent as LensEmbeddableComponent } from '@kbn/lens-plugin/public';
import type {
  EventAnnotationGroupConfig,
  EventAnnotationGroupContent,
} from '@kbn/event-annotation-common';
import { ISessionService, UI_SETTINGS } from '@kbn/data-plugin/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-components';
import { css } from '@emotion/react';
import { GroupEditorFlyout } from './group_editor_flyout';

export const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
export const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

const getCustomColumn = (dataViews: DataView[]) => {
  const dataViewNameMap = Object.fromEntries(
    dataViews.map((dataView) => [dataView.id, dataView.name ?? dataView.title])
  );

  return {
    field: 'dataView',
    name: i18n.translate('eventAnnotationListing.tableList.dataView', {
      defaultMessage: 'Data view',
    }),
    sortable: false,
    width: '150px',
    render: (_field: string, record: EventAnnotationGroupContent) => (
      <div>
        {record.attributes.dataViewSpec
          ? record.attributes.dataViewSpec.name
          : dataViewNameMap[record.attributes.indexPatternId] ?? (
              <EuiText size="s" color={'danger'}>
                <FormattedMessage
                  id="eventAnnotationListing.tableList.dataView.missing"
                  defaultMessage="{errorIcon} No longer exists"
                  values={{
                    errorIcon: (
                      <EuiIcon
                        type="error"
                        css={css`
                          margin-top: -3px;
                        `}
                      />
                    ),
                  }}
                />
              </EuiText>
            )}
      </div>
    ),
  };
};

export const EventAnnotationGroupTableList = ({
  uiSettings,
  eventAnnotationService,
  sessionService,
  visualizeCapabilities,
  savedObjectsTagging,
  parentProps,
  dataViews,
  createDataView,
  queryInputServices,
  toasts,
  navigateToLens,
  LensEmbeddableComponent,
}: {
  uiSettings: IUiSettingsClient;
  eventAnnotationService: EventAnnotationServiceType;
  sessionService: ISessionService;
  visualizeCapabilities: Record<string, boolean | Record<string, boolean>>;
  savedObjectsTagging: SavedObjectsTaggingApi;
  parentProps: TableListTabParentProps;
  dataViews: DataView[];
  createDataView: (spec: DataViewSpec) => Promise<DataView>;
  queryInputServices: QueryInputServices;
  toasts: IToasts;
  navigateToLens: () => void;
  LensEmbeddableComponent: LensEmbeddableComponent;
}) => {
  const listingLimit = uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

  const [searchSessionId, setSearchSessionId] = useState<string>(sessionService.start());

  const refreshSearchSession = useCallback(() => {
    setSearchSessionId(sessionService.start());
  }, [sessionService]);

  useEffect(() => {
    return () => {
      sessionService.clear();
    };
  }, [sessionService]);

  const [refreshListBouncer, setRefreshListBouncer] = useState(false);

  const refreshList = useCallback(() => {
    setRefreshListBouncer((prev) => !prev);
  }, []);

  const fetchItems = useCallback(
    (
      searchTerm: string,
      {
        references,
        referencesToExclude,
      }: {
        references?: SavedObjectsFindOptionsReference[];
        referencesToExclude?: SavedObjectsFindOptionsReference[];
      } = {}
    ) => {
      // todo - allow page size changes
      return eventAnnotationService.findAnnotationGroupContent(
        searchTerm,
        listingLimit, // TODO is this right?
        references?.map(({ id }) => id),
        referencesToExclude?.map(({ id }) => id)
      );
    },
    [eventAnnotationService, listingLimit]
  );

  const editItem = useCallback(
    ({ id }: EventAnnotationGroupContent) => {
      if (visualizeCapabilities.save) {
        eventAnnotationService
          .loadAnnotationGroup(id)
          .then((group) => setGroupToEditInfo({ group, id }));
      }
    },
    [eventAnnotationService, visualizeCapabilities.save]
  );

  const [groupToEditInfo, setGroupToEditInfo] = useState<{
    group: EventAnnotationGroupConfig;
    id: string;
  }>();

  const flyout = groupToEditInfo ? (
    <GroupEditorFlyout
      group={groupToEditInfo.group}
      updateGroup={(newGroup) => setGroupToEditInfo({ group: newGroup, id: groupToEditInfo.id })}
      onClose={() => setGroupToEditInfo(undefined)}
      onSave={() =>
        (groupToEditInfo.id
          ? eventAnnotationService.updateAnnotationGroup(groupToEditInfo.group, groupToEditInfo.id)
          : eventAnnotationService.createAnnotationGroup(groupToEditInfo.group)
        ).then(() => {
          setGroupToEditInfo(undefined);
          toasts.addSuccess(`Saved "${groupToEditInfo.group.title}"`);
          refreshList();
        })
      }
      savedObjectsTagging={savedObjectsTagging}
      dataViews={dataViews}
      createDataView={createDataView}
      LensEmbeddableComponent={LensEmbeddableComponent}
      queryInputServices={queryInputServices}
      searchSessionId={searchSessionId}
      refreshSearchSession={refreshSearchSession}
      timePickerQuickRanges={uiSettings.get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES)}
    />
  ) : undefined;

  return (
    <>
      <TableListViewTable<EventAnnotationGroupContent>
        id="eventAnnotation"
        refreshListBouncer={refreshListBouncer}
        tableCaption={i18n.translate('eventAnnotationListing.tableList.listTitle', {
          defaultMessage: 'Annotation Library',
        })}
        findItems={fetchItems}
        deleteItems={
          visualizeCapabilities.delete
            ? (items) => eventAnnotationService.deleteAnnotationGroups(items.map(({ id }) => id))
            : undefined
        }
        editItem={editItem}
        listingLimit={listingLimit}
        initialPageSize={initialPageSize}
        initialFilter={''}
        customTableColumn={getCustomColumn(dataViews)}
        emptyPrompt={
          <EuiEmptyPrompt
            color="transparent"
            title={
              <EuiTitle>
                <h2>
                  <FormattedMessage
                    id="eventAnnotationListing.tableList.emptyPrompt.title"
                    defaultMessage="Create your first annotation in Lens"
                  />
                </h2>
              </EuiTitle>
            }
            body={
              <p>
                <FormattedMessage
                  id="eventAnnotationListing.tableList.emptyPrompt.body"
                  defaultMessage="You can create and save annotations for use across multiple visualizations in the Lens editor."
                />
              </p>
            }
            actions={
              <EuiButton onClick={navigateToLens}>
                <FormattedMessage
                  id="eventAnnotationListing.tableList.emptyPrompt.cta"
                  defaultMessage="Create annotation in Lens"
                />
              </EuiButton>
            }
            iconType="flag"
          />
        }
        entityName={i18n.translate('eventAnnotationListing.tableList.entityName', {
          defaultMessage: 'annotation group',
        })}
        entityNamePlural={i18n.translate('eventAnnotationListing.tableList.entityNamePlural', {
          defaultMessage: 'annotation groups',
        })}
        getOnClickTitle={(item) => () => editItem(item)}
        {...parentProps}
      />
      {flyout}
    </>
  );
};
