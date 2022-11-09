/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsClient } from '@kbn/core/server';
import { GuideState } from '@kbn/guided-onboarding';
import { guideStateSavedObjectsType } from '../saved_objects';

export const findGuideById = async (savedObjectsClient: SavedObjectsClient, guideId: string) => {
  return savedObjectsClient.find<GuideState>({
    type: guideStateSavedObjectsType,
    search: `"${guideId}"`,
    searchFields: ['guideId'],
  });
};

export const findActiveGuide = async (savedObjectsClient: SavedObjectsClient) => {
  return savedObjectsClient.find<GuideState>({
    type: guideStateSavedObjectsType,
    search: 'true',
    searchFields: ['isActive'],
  });
};

export const findAllGuides = async (savedObjectsClient: SavedObjectsClient) => {
  return savedObjectsClient.find<GuideState>({ type: guideStateSavedObjectsType });
};
