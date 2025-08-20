/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { ContentClientProvider } from '@kbn/content-management-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { getServices } from '../../kibana_services';

interface ContentByTagsProps {}

export const ContentByTagTable = ({}: ContentByTagsProps) => {
  const { application, uiSettings, savedObjectsTagging, contentClient, http } = getServices();

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
              euiTablePersistProps={{}}
              onChoose={(id, type, name, savedObject, editUrl) => {
                const savedObjectEditUrl = editUrl
                  ? editUrl
                  : `/app/management/kibana/objects/${type}/${id}`;
                application.navigateToUrl(http.basePath.prepend(savedObjectEditUrl));
              }}
              savedObjectMetaData={[
                {
                  type: `search`,
                  getIconForSavedObject: () => 'discoverApp',
                  name: 'Discover session',
                  getEditUrl: (savedObject) => `/app/discover/view/${savedObject.id}`,
                },
                {
                  type: 'index-pattern',
                  getIconForSavedObject: () => 'indexPatternApp',
                  name: 'Data view',
                  getEditUrl: (savedObject) => `/app/management/data_views/edit/${savedObject.id}`,
                },
                {
                  type: `visualization`,
                  getIconForSavedObject: () => 'visualizeApp',
                  name: 'Visualization',
                  getEditUrl: (savedObject) => `/app/visualize/edit/${savedObject.id}`,
                },
                {
                  type: 'lens',
                  getIconForSavedObject: () => 'lensApp',
                  name: 'Lens',
                  getEditUrl: (savedObject) => `/app/lens/edit/${savedObject.id}`,
                },
                {
                  type: 'map',
                  getIconForSavedObject: () => 'logoMaps',
                  name: 'Map',
                  getEditUrl: (savedObject) => `/app/maps/map/${savedObject.id}`,
                },
                {
                  type: 'dashboard',
                  getIconForSavedObject: () => 'dashboardApp',
                  name: 'Dashboard',
                  getEditUrl: (savedObject) => `/app/dashboards/view/${savedObject.id}`,
                },
              ]}
            />
          </I18nProvider>
        </ContentClientProvider>
      </EuiPanel>
    </KibanaPageTemplate.Section>
  );
};
