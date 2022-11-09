
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
