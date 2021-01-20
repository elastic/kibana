/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsClientContract } from 'kibana/public';

import { EmbeddableStart } from '../services/embeddable';
import { SavedObjectLoader, SavedObjectsStart } from '../services/saved_objects';

import { createSavedDashboardClass } from './saved_dashboard';

interface Services {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjects: SavedObjectsStart;
  embeddableStart: EmbeddableStart;
}

/**
 * @param services
 */
export function createSavedDashboardLoader({
  savedObjects,
  savedObjectsClient,
  embeddableStart,
}: Services) {
  const SavedDashboard = createSavedDashboardClass(savedObjects, embeddableStart);
  return new SavedObjectLoader(SavedDashboard, savedObjectsClient);
}
