/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type {
  BaseSavedObjectFinderProps,
  SavedObjectFinderProps,
  SavedObjectFinderServices,
} from './saved_object_finder';

const LazySavedObjectFinder = React.lazy(() => import('./saved_object_finder'));
export const SavedObjectFinder = (props: SavedObjectFinderProps) => (
  <React.Suspense fallback={null}>
    <LazySavedObjectFinder {...props} />
  </React.Suspense>
);

export const getSavedObjectFinder =
  (services: SavedObjectFinderServices) => (props: BaseSavedObjectFinderProps) =>
    <SavedObjectFinder services={services} {...props} />;

export type {
  SavedObjectMetaData,
  BaseSavedObjectFinderProps,
  SavedObjectFinderProps,
  SavedObjectFinderServices,
} from './saved_object_finder';
