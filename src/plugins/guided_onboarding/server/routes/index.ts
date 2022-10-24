/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, SavedObjectsClient } from '@kbn/core/server';
import type { GuideState } from '@kbn/guided-onboarding';
import { API_BASE_PATH } from '../../common/constants';
import { guidedSetupSavedObjectsType } from '../saved_objects';

const findGuideById = async (savedObjectsClient: SavedObjectsClient, guideId: string) => {
  return savedObjectsClient.find<GuideState>({
    type: guidedSetupSavedObjectsType,
    search: `"${guideId}"`,
    searchFields: ['guideId'],
  });
};

const findActiveGuide = async (savedObjectsClient: SavedObjectsClient) => {
  return savedObjectsClient.find<GuideState>({
    type: guidedSetupSavedObjectsType,
    search: 'true',
    searchFields: ['isActive'],
  });
};

const findAllGuides = async (savedObjectsClient: SavedObjectsClient) => {
  return savedObjectsClient.find<GuideState>({ type: guidedSetupSavedObjectsType });
};

export function defineRoutes(router: IRouter) {
  // Fetch all guides state; optionally pass the query param ?active=true to only return the active guide
  router.get(
    {
      path: `${API_BASE_PATH}/state`,
      validate: {
        query: schema.object({
          active: schema.maybe(schema.boolean()),
        }),
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const soClient = coreContext.savedObjects.client as SavedObjectsClient;

      const existingGuides =
        request.query.active === true
          ? await findActiveGuide(soClient)
          : await findAllGuides(soClient);

      if (existingGuides.total > 0) {
        const guidesState = existingGuides.saved_objects.map((guide) => guide.attributes);
        return response.ok({
          body: { state: guidesState },
        });
      } else {
        // If no SO exists, we assume state hasn't been stored yet and return an empty array
        return response.ok({
          body: { state: [] },
        });
      }
    }
  );

  // Update the guide state for the passed guideId;
  // will also check any existing active guides and update them to an "inactive" state
  router.put(
    {
      path: `${API_BASE_PATH}/state`,
      validate: {
        body: schema.object({
          status: schema.string(),
          guideId: schema.string(),
          isActive: schema.boolean(),
          steps: schema.arrayOf(
            schema.object({
              status: schema.string(),
              id: schema.string(),
            })
          ),
        }),
      },
    },
    async (context, request, response) => {
      const updatedGuideState = request.body;

      const coreContext = await context.core;
      const savedObjectsClient = coreContext.savedObjects.client as SavedObjectsClient;

      const selectedGuideSO = await findGuideById(savedObjectsClient, updatedGuideState.guideId);

      // If the SO already exists, update it, else create a new SO
      if (selectedGuideSO.total > 0) {
        const updatedGuides = [];
        const selectedGuide = selectedGuideSO.saved_objects[0];

        updatedGuides.push({
          type: guidedSetupSavedObjectsType,
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
                type: guidedSetupSavedObjectsType,
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

        return response.ok({
          body: {
            state: updatedGuidesResponse,
          },
        });
      } else {
        // If we are activating a new guide, we need to check if there is an existing active guide
        // If yes, we need to mark it as inactive (only 1 guide can be active at a time)
        if (updatedGuideState.isActive) {
          const activeGuideSO = await findActiveGuide(savedObjectsClient);

          if (activeGuideSO.total > 0) {
            const activeGuide = activeGuideSO.saved_objects[0];
            await savedObjectsClient.update(guidedSetupSavedObjectsType, activeGuide.id, {
              ...activeGuide.attributes,
              isActive: false,
            });
          }
        }

        const createdGuideResponse = await savedObjectsClient.create(
          guidedSetupSavedObjectsType,
          updatedGuideState
        );

        return response.ok({
          body: {
            state: createdGuideResponse,
          },
        });
      }
    }
  );
}
