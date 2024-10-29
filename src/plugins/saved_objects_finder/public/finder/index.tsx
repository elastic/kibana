/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';
import React from 'react';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { SavedObjectFinderProps } from './saved_object_finder';

const LazySavedObjectFinder = React.lazy(() => import('./saved_object_finder'));
const SavedObjectFinder = (props: SavedObjectFinderProps) => (
  <React.Suspense
    fallback={
      <EuiDelayRender delay={300}>
        <EuiSkeletonText />
      </EuiDelayRender>
    }
  >
    <LazySavedObjectFinder {...props} />
  </React.Suspense>
);

export const getSavedObjectFinder = (
  contentClient: ContentClient,
  uiSettings: IUiSettingsClient,
  savedObjectsTagging?: SavedObjectsTaggingApi
) => {
  return (props: SavedObjectFinderProps) => (
    <SavedObjectFinder {...props} services={{ savedObjectsTagging, contentClient, uiSettings }} />
  );
};

export type { SavedObjectMetaData, SavedObjectFinderProps } from './saved_object_finder';
export { SavedObjectFinder };
