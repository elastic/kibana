/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { EuiPanel, EuiTitle, EuiSpacer, EuiBadge, EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ContentClientProvider } from '@kbn/content-management-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { getServices } from '../../kibana_services';

const HOME_SELECTED_TAG_LOCAL_STORAGE_KEY = 'homeContentByTagTableTag';

export const ContentByTagTable = () => {
  const { application, uiSettings, savedObjectsTagging, contentClient, http } = getServices();
  const [tagId, setTagId] = React.useState(
    localStorage.getItem(HOME_SELECTED_TAG_LOCAL_STORAGE_KEY) || ''
  );
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const tag = savedObjectsTagging.getTaggingApi()?.ui.getTag(tagId);

  const TagsSelector = savedObjectsTagging.getTaggingApi()?.ui.components.TagSelector;

  const togglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const tagButtonAnchor = tag ? (
    <EuiBadge
      color={tag.color}
      onClick={togglePopover}
      onClickAriaLabel={i18n.translate('home.contentByTagsTable.selectTagAriaLabel', {
        defaultMessage: 'Click to open tag selection popover',
      })}
    >
      {tag?.name || 'Select tag'}
    </EuiBadge>
  ) : (
    <EuiButtonEmpty size="s" onClick={togglePopover}>
      {i18n.translate('home.contentByTagsTable.selectTag', {
        defaultMessage: 'Select tag',
      })}
    </EuiButtonEmpty>
  );

  return (
    <EuiPanel>
      <EuiTitle size="s">
        <h3>
          {i18n.translate('home.contentByTagsTable.title', {
            defaultMessage: 'Content for ',
          })}
          <EuiPopover
            button={tagButtonAnchor}
            closePopover={closePopover}
            isOpen={isPopoverOpen}
            panelStyle={{ minWidth: 300 }}
          >
            {TagsSelector ? (
              <TagsSelector
                selected={tagId ? [tagId] : []}
                onTagsSelected={([selectedTag, newTag = '']) => {
                  localStorage.setItem(HOME_SELECTED_TAG_LOCAL_STORAGE_KEY, newTag || selectedTag);
                  setTagId(newTag || selectedTag);
                }}
              />
            ) : null}
          </EuiPopover>
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <ContentClientProvider contentClient={contentClient}>
        <I18nProvider>
          <SavedObjectFinder
            id="homeContentByTagsTable"
            showFilter={false}
            showSearch={false}
            services={{
              savedObjectsTagging: savedObjectsTagging.getTaggingApi(),
              contentClient,
              uiSettings,
            }}
            initialTag={tag?.name}
            onChoose={(id, type, name, savedObject, editUrl) => {
              const savedObjectEditUrl = editUrl
                ? editUrl
                : `/app/management/kibana/objects/${type}/${id}`;
              application.navigateToUrl(http.basePath.prepend(savedObjectEditUrl));
            }}
            savedObjectMetaData={[
              {
                type: 'dashboard',
                getIconForSavedObject: () => 'dashboardApp',
                name: 'Dashboard',
                getEditUrl: (savedObject) => `/app/dashboards/view/${savedObject.id}`,
              },
              // {
              //   type: `search`,
              //   getIconForSavedObject: () => 'discoverApp',
              //   name: 'Discover session',
              //   getEditUrl: (savedObject) => `/app/discover/view/${savedObject.id}`,
              // },
              // {
              //   type: `visualization`,
              //   getIconForSavedObject: () => 'visualizeApp',
              //   name: 'Visualization',
              //   getEditUrl: (savedObject) => `/app/visualize#/edit/${savedObject.id}`,
              // },
              // {
              //   type: 'lens',
              //   getIconForSavedObject: () => 'lensApp',
              //   name: 'Lens',
              //   getEditUrl: (savedObject) => `/app/lens#/edit/${savedObject.id}`,
              // },
              // {
              //   type: 'map',
              //   getIconForSavedObject: () => 'logoMaps',
              //   name: 'Map',
              //   getEditUrl: (savedObject) => `/app/maps/map/${savedObject.id}`,
              // },
            ]}
          />
        </I18nProvider>
      </ContentClientProvider>
    </EuiPanel>
  );
};
