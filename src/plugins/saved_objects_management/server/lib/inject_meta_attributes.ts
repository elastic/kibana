/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '@kbn/core/server';
import { ISavedObjectsManagement } from '../services';
import { SavedObjectWithMetadata } from '../types';

export function injectMetaAttributes<T = unknown>(
  savedObject: SavedObject<T> | SavedObjectWithMetadata<T>,
  savedObjectsManagement: ISavedObjectsManagement
): SavedObjectWithMetadata<T> {
  const result = {
    ...savedObject,
    meta: (savedObject as SavedObjectWithMetadata).meta || {},
  };

  // Add extra meta information
  result.meta.icon = savedObjectsManagement.getIcon(savedObject.type);
  result.meta.title = savedObjectsManagement.getTitle(savedObject);
  result.meta.editUrl = savedObjectsManagement.getEditUrl(savedObject);
  result.meta.inAppUrl = savedObjectsManagement.getInAppUrl(savedObject);
  result.meta.namespaceType = savedObjectsManagement.getNamespaceType(savedObject);
  result.meta.hiddenType = savedObjectsManagement.isHidden(savedObject);

  return result;
}
