/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, SavedObjectsClient } from '@kbn/core/server';
import { guidedSetupSavedObjectsType } from '../saved_objects';

// TODO fix TS
const findGuide = async (savedObjectsClient: SavedObjectsClient, guideId: string): Promise<any> => {
  return savedObjectsClient.find({
    type: guidedSetupSavedObjectsType,
    search: `"${guideId}"`,
    searchFields: ['guideId'],
  });
};

// TODO fix TS
const findActiveGuide = async (savedObjectsClient: SavedObjectsClient): Promise<any> => {
  return savedObjectsClient.find({
    type: guidedSetupSavedObjectsType,
    search: 'true',
    searchFields: ['isActive'],
  });
};

// TODO fix TS
const findAllGuides = async (savedObjectsClient: SavedObjectsClient): Promise<any> => {
  return savedObjectsClient.find({ type: guidedSetupSavedObjectsType });
};

export function defineRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/guided_onboarding/state',
      validate: {
        query: schema.object({
          active: schema.maybe(schema.boolean()),
        }),
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const soClient = coreContext.savedObjects.client as SavedObjectsClient;

      const existingGuides = request.query.active
        ? await findActiveGuide(soClient)
        : await findAllGuides(soClient);

      if (existingGuides.total > 0) {
        const guidesState = existingGuides.saved_objects.map((guide) => guide.attributes);
        return response.ok({
          body: { state: guidesState },
        });
      } else {
        return response.ok({
          body: { state: [] },
        });
      }
    }
  );

  router.put(
    {
      path: '/api/guided_onboarding/state/{guideId}',
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
        params: schema.object({
          guideId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const updatedGuidesState = request.body;
      const { guideId } = request.params;

      const coreContext = await context.core;
      const savedObjectsClient = coreContext.savedObjects.client as SavedObjectsClient;

      const activeGuideSO = await findActiveGuide(savedObjectsClient);
      const selectedGuideSO = await findGuide(savedObjectsClient, guideId);

      // If the SO already exists, update it, else create a new SO
      if (selectedGuideSO.total > 0) {
        const updatedGuides = [];
        const selectedGuide = selectedGuideSO.saved_objects[0];

        updatedGuides.push({
          type: guidedSetupSavedObjectsType,
          id: selectedGuide.id,
          attributes: {
            ...updatedGuidesState,
          },
        });

        // We need to check if there is an existing active guide
        // If yes, we need to mark it as inactive (only 1 guide can be active at a time)
        if (activeGuideSO.total > 0) {
          const activeGuide = activeGuideSO.saved_objects[0];
          updatedGuides.push({
            type: guidedSetupSavedObjectsType,
            id: selectedGuide.id,
            attributes: {
              ...activeGuide.attributes,
              isActive: false,
            },
          });
        }

        const updatedGuidedSetupSO = await savedObjectsClient.bulkUpdate(updatedGuides);

        return response.ok({
          body: {
            state: updatedGuidedSetupSO,
          },
        });
      } else {
        // If there is an existing "active" guide, update it back to inactive
        if (activeGuideSO.total > 0) {
          const activeGuide = activeGuideSO.saved_objects[0];
          await savedObjectsClient.update(guidedSetupSavedObjectsType, activeGuide.id, {
            ...activeGuide.attributes,
            isActive: false,
          });
        }

        const updatedGuidedSetupSO = await savedObjectsClient.create(
          guidedSetupSavedObjectsType,
          updatedGuidesState
        );

        return response.ok({
          body: {
            state: updatedGuidedSetupSO,
          },
        });
      }
    }
  );
}
