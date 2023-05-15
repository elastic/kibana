/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';
import React from 'react';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { HttpStart } from '@kbn/core-http-browser';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
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
  uiSettings: IUiSettingsClient,
  http: HttpStart,
  savedObjectsManagement: SavedObjectsManagementPluginStart,
  savedObjectsTagging?: SavedObjectsTaggingApi
) => {
  return (props: SavedObjectFinderProps) => (
    <SavedObjectFinder
      {...props}
      services={{ uiSettings, http, savedObjectsManagement, savedObjectsTagging }}
    />
  );
};

export type { SavedObjectMetaData, SavedObjectFinderProps } from './saved_object_finder';
export { SavedObjectFinder };
