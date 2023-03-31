/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { TableListView } from '@kbn/content-management-table-list';
import { i18n } from '@kbn/i18n';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { SavedObjectsFindOptionsReference } from '@kbn/core-saved-objects-api-browser';
import type { EventAnnotationServiceType } from '../event_annotation_service/types';

export const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
export const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

export const EventAnnotationGroupListView = ({
  uiSettings,
  eventAnnotationService,
  visualizeCapabilities,
}: {
  uiSettings: IUiSettingsClient;
  eventAnnotationService: EventAnnotationServiceType;
  visualizeCapabilities: Record<string, boolean | Record<string, boolean>>;
}) => {
  const listingLimit = uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

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

  return (
    <TableListView
      id="annotation"
      headingId="eventAnnotationGroupsListingHeading"
      // we allow users to create visualizations even if they can't save them
      // for data exploration purposes
      // createItem={createNewGroup}
      findItems={fetchItems}
      deleteItems={
        visualizeCapabilities.delete
          ? (items) => eventAnnotationService.deleteAnnotationGroups(items.map(({ id }) => id))
          : undefined
      }
      // editItem={visualizeCapabilities.save ? editItem : undefined}
      // customTableColumn={getCustomColumn()}
      listingLimit={listingLimit}
      initialPageSize={initialPageSize}
      initialFilter={''}
      // contentEditor={{
      //   isReadonly: !visualizeCapabilities.save,
      //   onSave: onContentEditorSave,
      //   customValidators: contentEditorValidators,
      // }}
      // emptyPrompt={noItemsFragment}
      entityName={i18n.translate('eventAnnotation.tableList.entityName', {
        defaultMessage: 'annotation group',
      })}
      entityNamePlural={i18n.translate('eventAnnotation.tableList.entityNamePlural', {
        defaultMessage: 'annotation groups',
      })}
      tableListTitle={i18n.translate('eventAnnotation.tableList.listTitle', {
        defaultMessage: 'Annotation Library',
      })}
      onClickTitle={() => {}}
      // getDetailViewLink={({ attributes: { editApp, editUrl, error } }) =>
      //   getVisualizeListItemLink(core.application, kbnUrlStateStorage, editApp, editUrl, error)
      // }
    />
  );
};
