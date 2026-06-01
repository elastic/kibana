/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';

import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import type { MSearchIn, MSearchResult } from '@kbn/content-management-plugin/common';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import { i18n } from '@kbn/i18n';
import type { CanAddNewPanel } from '@kbn/presentation-publishing';
import { apiHasType } from '@kbn/presentation-publishing';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import type { SavedObjectFinderProps } from '@kbn/saved-objects-finder-plugin/public';
import {
  SavedObjectFinder,
  type SavedObjectMetaData,
} from '@kbn/saved-objects-finder-plugin/public';

import {
  contentManagement,
  core,
  savedObjectsTaggingOss,
  usageCollection,
} from '../kibana_services';
import { getAddFromLibraryType, useAddFromLibraryTypes } from './registry';
import { SEARCH_ROUTE_PATH } from '../../common/constants';
import type { SearchLibraryResponseType } from '../../server/search_route/types';

const runAddTelemetry = (
  parent: unknown,
  savedObject: SavedObjectCommon,
  savedObjectMetaData: SavedObjectMetaData
) => {
  if (!apiHasType(parent)) return;
  const type = savedObjectMetaData.getSavedObjectSubType
    ? savedObjectMetaData.getSavedObjectSubType(savedObject)
    : savedObjectMetaData.type;

  usageCollection?.reportUiCounter?.(parent.type, METRIC_TYPE.CLICK, `${type}:add`);
};

export interface AddFromLibraryFormProps {
  container: CanAddNewPanel;
  modalTitleId?: string;
}

export interface AddFromLibraryContentProps {
  container: CanAddNewPanel;
}

export const AddFromLibraryContent = ({ container }: AddFromLibraryContentProps) => {
  const libraryTypes = useAddFromLibraryTypes();

  const onChoose: SavedObjectFinderProps['onChoose'] = useCallback(
    async (
      id: SavedObjectCommon['id'],
      type: SavedObjectCommon['type'],
      name: string,
      savedObject: SavedObjectCommon
    ) => {
      const libraryType = getAddFromLibraryType(type);
      if (!libraryType) {
        core.notifications.toasts.addWarning(
          i18n.translate('embeddableApi.addPanel.typeNotFound', {
            defaultMessage: 'Unable to load type: {type}',
            values: { type },
          })
        );
        return;
      }
      libraryType.onAdd(container, savedObject);
      runAddTelemetry(container, savedObject, libraryType.savedObjectMetaData);
    },
    [container]
  );

  return (
    <SavedObjectFinder
      id="embeddableAddPanel"
      services={{
        contentClient: {
          ...contentManagement.client,
          mSearch: async (input: MSearchIn): Promise<MSearchResult<any>> => {
            try {
              const result = (await core.http.post(SEARCH_ROUTE_PATH, {
                body: JSON.stringify({
                  type: input.contentTypes.map(({ contentTypeId }) => contentTypeId),
                  ...(input.query.text && { search: `${input.query.text}*` }),
                  limit: input.query.limit,
                  tags: input.query.tags,
                }),
              })) as SearchLibraryResponseType;
              return { hits: result.hits, pagination: { total: result.total } };
            } catch (e) {
              return { hits: [], pagination: { total: 0 } };
            }
          },
        } as ContentClient,
        savedObjectsTagging: savedObjectsTaggingOss?.getTaggingApi(),
        uiSettings: core.uiSettings,
      }}
      onChoose={onChoose}
      savedObjectMetaData={libraryTypes}
      showFilter={true}
      noItemsMessage={i18n.translate('embeddableApi.addPanel.noMatchingObjectsMessage', {
        defaultMessage: 'No matching objects found.',
      })}
      getTooltipText={(item) => {
        return item.managed
          ? i18n.translate('embeddableApi.addPanel.managedPanelTooltip', {
              defaultMessage:
                'Elastic manages this panel. Adding it to a dashboard unlinks it from the library.',
            })
          : undefined;
      }}
    />
  );
};

export const AddFromLibraryFlyout = ({ container, modalTitleId }: AddFromLibraryFormProps) => {
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={modalTitleId}>
            {i18n.translate('embeddableApi.addPanel.Title', { defaultMessage: 'Add from library' })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AddFromLibraryContent container={container} />
      </EuiFlyoutBody>
    </>
  );
};
