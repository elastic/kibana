/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useState } from 'react';
import type { EuiBasicTableColumn, EuiTableFieldDataColumnType } from '@elastic/eui';
import { formatDate, EuiLink, EuiPanel, EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { ChromeRecentlyAccessedHistoryItem } from '@kbn/core-chrome-browser';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { i18n } from '@kbn/i18n';
import { ContentClientProvider, type ContentClient } from '@kbn/content-management-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';

interface ContentByTagsProps {
  contentClient: ContentClient;
  uiSettings: IUiSettingsClient;
  savedObjectsTagging: SavedObjectTaggingOssPluginStart;
}

export const ContentByTagTable = ({
  contentClient,
  uiSettings,
  savedObjectsTagging,
}: ContentByTagsProps) => {
  return (
    <KibanaPageTemplate.Section
      bottomBorder
      paddingSize="xl"
      aria-labelledby="homeSolutions__title"
    >
      <EuiPanel>
        <EuiTitle size="s">
          <h3>
            {i18n.translate('home.contentByTagsTable.title', {
              defaultMessage: 'Content by tags',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        {/* <EuiText size="xs">Showing {resultsCount}</EuiText> */}
        <ContentClientProvider contentClient={contentClient}>
          <I18nProvider>
            <SavedObjectFinder
              id="homeContentByTagsTable"
              showFilter={true}
              services={{
                savedObjectsTagging: savedObjectsTagging.getTaggingApi(),
                contentClient,
                uiSettings,
              }}
              onChoose={(...args) => {
                alert(JSON.stringify(args));
                console.log(args);
              }}
              savedObjectMetaData={[
                {
                  type: `search`,
                  getIconForSavedObject: () => 'discoverApp',
                  name: 'Discover session',
                },
                {
                  type: 'index-pattern',
                  getIconForSavedObject: () => 'indexPatternApp',
                  name: 'Data view',
                },
                {
                  type: `visualization`,
                  getIconForSavedObject: () => 'visualizeApp',
                  name: 'Visualization',
                },
                {
                  type: 'lens',
                  getIconForSavedObject: () => 'lensApp',
                  name: 'Lens',
                },
                {
                  type: 'map',
                  getIconForSavedObject: () => 'logoMaps',
                  name: 'Map',
                },
                {
                  type: 'event-annotation-group',
                  getIconForSavedObject: () => 'annotation',
                  name: 'Annotation',
                },
                {
                  type: 'dashboard',
                  getIconForSavedObject: () => 'dashboardApp',
                  name: 'Dashboard',
                },
              ]}
            />
          </I18nProvider>
        </ContentClientProvider>
      </EuiPanel>
    </KibanaPageTemplate.Section>
  );
};
