/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SavedObjectsClientContract } from '../../../../core/public/saved_objects/saved_objects_client';
import type { EmbeddableStart } from '../../../embeddable/public/plugin';
import type { SavedObjectsStart } from '../../../saved_objects/public/plugin';
import { SavedObjectLoader } from '../../../saved_objects/public/saved_object/saved_object_loader';
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
