/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsClient } from '@kbn/core/server';
import { GuideConfig, GuideId, GuideState, GuideStep } from '@kbn/guided-onboarding';
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

export const updateGuideState = async (
  savedObjectsClient: SavedObjectsClient,
  updatedGuideState: GuideState
) => {
  const selectedGuideSO = await findGuideById(savedObjectsClient, updatedGuideState.guideId);

  // If the SO already exists, update it, else create a new SO
  if (selectedGuideSO.total > 0) {
    const updatedGuides = [];
    const selectedGuide = selectedGuideSO.saved_objects[0];

    updatedGuides.push({
      type: guideStateSavedObjectsType,
      id: selectedGuide.id,
      attributes: {
        ...updatedGuideState,
      },
    });

    // If we are activating a new guide, we need to check if there is a different, existing active guide
    // If yes, we need to mark it as inactive (only 1 guide can be active at a time)
    if (updatedGuideState.isActive) {
      const activeGuideSO = await findActiveGuide(savedObjectsClient);

      if (activeGuideSO.total > 0) {
        const activeGuide = activeGuideSO.saved_objects[0];
        if (activeGuide.attributes.guideId !== updatedGuideState.guideId) {
          updatedGuides.push({
            type: guideStateSavedObjectsType,
            id: activeGuide.id,
            attributes: {
              ...activeGuide.attributes,
              isActive: false,
            },
          });
        }
      }
    }

    const updatedGuidesResponse = await savedObjectsClient.bulkUpdate(updatedGuides);

    return updatedGuidesResponse;
  } else {
    // If we are activating a new guide, we need to check if there is an existing active guide
    // If yes, we need to mark it as inactive (only 1 guide can be active at a time)
    if (updatedGuideState.isActive) {
      const activeGuideSO = await findActiveGuide(savedObjectsClient);

      if (activeGuideSO.total > 0) {
        const activeGuide = activeGuideSO.saved_objects[0];
        await savedObjectsClient.update(guideStateSavedObjectsType, activeGuide.id, {
          ...activeGuide.attributes,
          isActive: false,
        });
      }
    }

    const createdGuideResponse = await savedObjectsClient.create(
      guideStateSavedObjectsType,
      updatedGuideState,
      {
        id: updatedGuideState.guideId,
      }
    );

    return createdGuideResponse;
  }
};

export const getDefaultGuideState = (guideId: GuideId, guideConfig: GuideConfig): GuideState => {
  // create a default state from the config
  const updatedSteps: GuideStep[] = guideConfig.steps.map((step, stepIndex) => {
    const isFirstStep = stepIndex === 0;
    return {
      id: step.id,
      // Only the first step should be activated when activating a new guide
      status: isFirstStep ? 'active' : 'inactive',
    };
  });

  return {
    guideId,
    isActive: true,
    status: 'not_started',
    steps: updatedSteps,
  };
};
