/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ContentClientProvider, type ContentClient } from '@kbn/content-management-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';

export const FinderApp = (props: {
  contentClient: ContentClient;
  core: CoreStart;
  savedObjectsTagging: SavedObjectTaggingOssPluginStart;
}) => {
  return (
    <ContentClientProvider contentClient={props.contentClient}>
      <I18nProvider>
        <SavedObjectFinder
          id="cmFinderApp"
          showFilter={true}
          services={{
            savedObjectsTagging: props.savedObjectsTagging.getTaggingApi(),
            contentClient: props.contentClient,
            uiSettings: props.core.uiSettings,
          }}
          onChoose={(...args) => {
            alert(JSON.stringify(args));
          }}
          savedObjectMetaData={[
            {
              type: `search`,
              getIconForSavedObject: () => 'discoverApp',
              name: 'Saved search',
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
          ]}
        />
      </I18nProvider>
    </ContentClientProvider>
  );
};
