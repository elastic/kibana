/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { TableListViewTable } from '@kbn/content-management-table-list-view-table';
import type { TableListTabParentProps } from '@kbn/content-management-tabbed-table-list-view';
import { i18n } from '@kbn/i18n';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { SavedObjectsFindOptionsReference } from '@kbn/core-saved-objects-api-browser';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { QueryInputServices } from '@kbn/visualization-ui-components';
import { IToasts } from '@kbn/core-notifications-browser';
import { EuiButton, EuiEmptyPrompt, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  EventAnnotationGroupConfig,
  EventAnnotationGroupContent,
} from '@kbn/event-annotation-common';
import type { EventAnnotationServiceType } from '../types';
import { GroupEditorFlyout } from './group_editor_flyout';

export const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
export const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

const getCustomColumn = (dataViews: DataView[]) => {
  const dataViewNameMap = Object.fromEntries(
    dataViews.map((dataView) => [dataView.id, dataView.name ?? dataView.title])
  );

  return {
    field: 'dataView',
    name: i18n.translate('eventAnnotationComponents.tableList.dataView', {
      defaultMessage: 'Data view',
    }),
    sortable: false,
    width: '150px',
    render: (_field: string, record: EventAnnotationGroupContent) => (
      <div>
        {record.attributes.dataViewSpec
          ? record.attributes.dataViewSpec.name
          : dataViewNameMap[record.attributes.indexPatternId]}
      </div>
    ),
  };
};

export const EventAnnotationGroupTableList = ({
  uiSettings,
  eventAnnotationService,
  visualizeCapabilities,
  savedObjectsTagging,
  parentProps,
  dataViews,
  createDataView,
  queryInputServices,
  toasts,
  navigateToLens,
}: {
  uiSettings: IUiSettingsClient;
  eventAnnotationService: EventAnnotationServiceType;
  visualizeCapabilities: Record<string, boolean | Record<string, boolean>>;
  savedObjectsTagging: SavedObjectsTaggingApi;
  parentProps: TableListTabParentProps;
  dataViews: DataView[];
  createDataView: (spec: DataViewSpec) => Promise<DataView>;
  queryInputServices: QueryInputServices;
  toasts: IToasts;
  navigateToLens: () => void;
}) => {
  const listingLimit = uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

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
      queryInputServices={queryInputServices}
    />
  ) : undefined;

  return (
    <>
      <TableListViewTable<EventAnnotationGroupContent>
        refreshListBouncer={refreshListBouncer}
        tableCaption={i18n.translate('eventAnnotationComponents.tableList.listTitle', {
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
            title={
              <EuiTitle>
                <h2>
                  <FormattedMessage
                    id="eventAnnotationComponents.tableList.emptyPrompt.title"
                    defaultMessage="Create your first annotation in Lens"
                  />
                </h2>
              </EuiTitle>
            }
            body={
              <p>
                <FormattedMessage
                  id="eventAnnotationComponents.tableList.emptyPrompt.body"
                  defaultMessage="You can create and save annotations for use across multiple visualization in the
                    Lens visualization editor."
                />
              </p>
            }
            actions={
              <EuiButton onClick={navigateToLens}>
                <FormattedMessage
                  id="eventAnnotationComponents.tableList.emptyPrompt.cta"
                  defaultMessage="Create new annotation in Lens"
                />
              </EuiButton>
            }
            iconType="flag"
          />
        }
        entityName={i18n.translate('eventAnnotationComponents.tableList.entityName', {
          defaultMessage: 'annotation group',
        })}
        entityNamePlural={i18n.translate('eventAnnotationComponents.tableList.entityNamePlural', {
          defaultMessage: 'annotation groups',
        })}
        onClickTitle={editItem}
        {...parentProps}
      />
      {flyout}
    </>
  );
};
