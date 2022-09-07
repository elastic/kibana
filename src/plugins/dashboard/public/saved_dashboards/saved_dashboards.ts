/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from '@kbn/core/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { SavedObjectsStart } from '@kbn/saved-objects-plugin/public';

import { SavedObjectLoader } from '../services/saved_object_loader';
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
  const SavedDashboard = createSavedDashboardClass(
    savedObjects,
    embeddableStart,
    savedObjectsClient
  );
  return new SavedObjectLoader(SavedDashboard, savedObjectsClient);
}
