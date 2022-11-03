/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import { GuideState } from '@kbn/guided-onboarding';
import { guideStateSavedObjectsType } from '../saved_objects';

export const findActiveGuide = async (savedObjectsClient: SavedObjectsClient) => {
  return savedObjectsClient.find<GuideState>({
    type: guideStateSavedObjectsType,
    search: 'true',
    searchFields: ['isActive'],
  });
};
