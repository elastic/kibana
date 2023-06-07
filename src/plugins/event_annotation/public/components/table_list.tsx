/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import {
  TableListViewTable,
  TableListTabParentProps,
} from '@kbn/content-management-table-list-view-table';
import { i18n } from '@kbn/i18n';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { SavedObjectsFindOptionsReference } from '@kbn/core-saved-objects-api-browser';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { QueryInputServices } from '@kbn/visualization-ui-components/public';
import { EventAnnotationGroupConfig } from '../../common';
import type { EventAnnotationServiceType } from '../event_annotation_service/types';
import { EventAnnotationGroupContent } from '../../common/types';
import { GroupEditorFlyout } from './group_editor_flyout';

export const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
export const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

export const EventAnnotationGroupTableList = ({
  uiSettings,
  eventAnnotationService,
  visualizeCapabilities,
  savedObjectsTagging,
  parentProps,
  dataViews,
  createDataView,
  queryInputServices,
}: {
  uiSettings: IUiSettingsClient;
  eventAnnotationService: EventAnnotationServiceType;
  visualizeCapabilities: Record<string, boolean | Record<string, boolean>>;
  savedObjectsTagging: SavedObjectsTaggingApi;
  parentProps: TableListTabParentProps;
  dataViews: DataView[];
  createDataView: (spec: DataViewSpec) => Promise<DataView>;
  queryInputServices: QueryInputServices;
}) => {
  const listingLimit = uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

  const [refreshListBouncer, setRefreshListBouncer] = useState(false);

  const refreshList = useCallback(() => {
    setRefreshListBouncer(!refreshListBouncer);
  }, [refreshListBouncer]);

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
        references,
        referencesToExclude
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
        tableCaption={i18n.translate('eventAnnotation.tableList.listTitle', {
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
        // emptyPrompt={noItemsFragment} TODO
        entityName={i18n.translate('eventAnnotation.tableList.entityName', {
          defaultMessage: 'annotation group',
        })}
        entityNamePlural={i18n.translate('eventAnnotation.tableList.entityNamePlural', {
          defaultMessage: 'annotation groups',
        })}
        onClickTitle={editItem}
        {...parentProps}
      />
      {flyout}
    </>
  );
};
