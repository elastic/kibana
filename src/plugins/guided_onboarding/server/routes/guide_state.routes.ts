/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter, SavedObjectsClient } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { GuideId, GuideState } from '@kbn/guided-onboarding';
import {
  createDefaultGuideState,
  updateGuideState,
  findGuideById,
} from '../helpers/guide_state.utils';
import { API_BASE_PATH, GuidesConfig } from '../../common';
import {findAllGuides, getPluginState, updatePluginStatus} from '../helpers';

export const registerGetGuideStateRoute = (router: IRouter) => {
  // Fetch all guides state
  router.get(
    {
      path: `${API_BASE_PATH}/guides`,
      validate: false,
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const soClient = coreContext.savedObjects.client as SavedObjectsClient;

      const existingGuides = await findAllGuides(soClient);

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
};

export const registerActivateGuideRoute = (router: IRouter, guidesConfig: GuidesConfig) => {
  // Activate a guide
  router.post(
    {
      path: `${API_BASE_PATH}/guides/activate/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { id } = request.params;
      const guideId = id as GuideId;
      const coreContext = await context.core;
      const soClient = coreContext.savedObjects.client as SavedObjectsClient;

      const existingGuideState = await findGuideById(soClient, guideId);

      let guideState: GuideState;
      // If the SO already exists, update it, else create a default guide state
      if (existingGuideState.total > 0) {
        guideState = {
          ...existingGuideState.saved_objects[0].attributes,
          isActive: true,
          status: 'in_progress',
        };
      } else {
        const guideConfig = guidesConfig[guideId];
        if (!guideConfig) {
          return response.badRequest();
        }
        guideState = await createDefaultGuideState(guideId, guideConfig);
      }
      await updateGuideState(soClient, guideState);
      await updatePluginStatus(soClient, 'in_progress');
      const pluginState = await getPluginState(soClient);
      return response.ok({
        body: {
          pluginState,
        },
      });
    }
  );
};
