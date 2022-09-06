/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TagDecoratedSavedObject } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SavedObject } from '@kbn/saved-objects-plugin/public';

import { DashboardSavedObject } from '../..';
import { pluginServices } from '../../services/plugin_services';

// TS is picky with type guards, we can't just inline `() => false`
function defaultTaggingGuard(_obj: SavedObject): _obj is TagDecoratedSavedObject {
  return false;
}

export const getTagsFromSavedDashboard = (savedDashboard: DashboardSavedObject) => {
  const hasTaggingCapabilities = getHasTaggingCapabilitiesGuard();
  return hasTaggingCapabilities(savedDashboard) ? savedDashboard.getTags() : [];
};

export const getHasTaggingCapabilitiesGuard = () => {
  const {
    savedObjectsTagging: { hasTagDecoration },
  } = pluginServices.getServices();

  return hasTagDecoration || defaultTaggingGuard;
};
