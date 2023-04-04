/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { TableListView } from '@kbn/content-management-table-list';
import { i18n } from '@kbn/i18n';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { SavedObjectsFindOptionsReference } from '@kbn/core-saved-objects-api-browser';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  htmlIdGenerator,
} from '@elastic/eui';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { EventAnnotationGroupConfig } from '../../common';
import type { EventAnnotationServiceType } from '../event_annotation_service/types';
import { EventAnnotationGroupEditor } from './event_annotation_group_editor';
import { EventAnnotationGroupContent } from '../../common/types';

export const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
export const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

export const EventAnnotationGroupListView = ({
  uiSettings,
  eventAnnotationService,
  visualizeCapabilities,
  savedObjectsTagging,
}: {
  uiSettings: IUiSettingsClient;
  eventAnnotationService: EventAnnotationServiceType;
  visualizeCapabilities: Record<string, boolean | Record<string, boolean>>;
  savedObjectsTagging: SavedObjectsTaggingApi;
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

  const [groupToEditInfo, setGroupToEditInfo] = useState<{
    group: EventAnnotationGroupConfig;
    id?: string;
  }>();

  const flyoutHeadingId = useMemo(() => htmlIdGenerator()(), []);

  const flyout = groupToEditInfo ? (
    <EuiFlyout onClose={() => setGroupToEditInfo(undefined)} size={'s'}>
      <EuiFlyoutHeader hasBorder aria-labelledby={flyoutHeadingId}>
        <EuiTitle>
          <h2 id={flyoutHeadingId}>Edit annotation group</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EventAnnotationGroupEditor
          group={groupToEditInfo.group}
          update={(group) => setGroupToEditInfo({ ...groupToEditInfo, group })}
          savedObjectsTagging={savedObjectsTagging}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => setGroupToEditInfo(undefined)}>
              <FormattedMessage id="eventAnnotation.edit.cancel" defaultMessage="Cancel" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="save"
              data-test-subj="saveAnnotationGroup"
              fill
              onClick={() =>
                (groupToEditInfo.id
                  ? eventAnnotationService.updateAnnotationGroup(
                      groupToEditInfo.group,
                      groupToEditInfo.id
                    )
                  : eventAnnotationService.createAnnotationGroup(groupToEditInfo.group)
                ).then(() => {
                  setGroupToEditInfo(undefined);
                })
              }
            >
              <FormattedMessage
                id="eventAnnotation.edit.save"
                defaultMessage="Save annotation group"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  ) : undefined;

  return (
    <div data-test-id="annotationLibraryListingView">
      <TableListView<EventAnnotationGroupContent>
        // we allow users to create visualizations even if they can't save them
        // for data exploration purposes
        // createItem={createNewGroup}
        findItems={fetchItems}
        deleteItems={
          visualizeCapabilities.delete
            ? (items) => eventAnnotationService.deleteAnnotationGroups(items.map(({ id }) => id))
            : undefined
        }
        editItem={
          visualizeCapabilities.save
            ? ({ id }) =>
                eventAnnotationService
                  .loadAnnotationGroup(id)
                  .then((group) => setGroupToEditInfo({ group, id }))
            : undefined
        }
        // customTableColumn={getCustomColumn()}
        listingLimit={listingLimit}
        initialPageSize={initialPageSize}
        initialFilter={''}
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
        onClickTitle={(item) => {
          // TODO - what happens if I click here?
        }}
        // getDetailViewLink={({ attributes: { editApp, editUrl, error } }) =>
        //   getVisualizeListItemLink(core.application, kbnUrlStateStorage, editApp, editUrl, error)
        // }
      />
      {flyout}
    </div>
  );
};
