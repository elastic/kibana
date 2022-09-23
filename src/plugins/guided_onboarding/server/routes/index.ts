/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, SavedObjectsClient } from '@kbn/core/server';
import {
  guidedSetupDefaultState,
  guidedSetupSavedObjectsId,
  guidedSetupSavedObjectsType,
} from '../saved_objects';

const doesGuidedSetupExist = async (savedObjectsClient: SavedObjectsClient): Promise<boolean> => {
  return savedObjectsClient
    .find({ type: guidedSetupSavedObjectsType })
    .then((foundSavedObjects) => foundSavedObjects.total > 0);
};

export function defineRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/guided_onboarding/state',
      validate: false,
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const soClient = coreContext.savedObjects.client as SavedObjectsClient;

      const stateExists = await doesGuidedSetupExist(soClient);
      if (stateExists) {
        const guidedSetupSO = await soClient.get(
          guidedSetupSavedObjectsType,
          guidedSetupSavedObjectsId
        );
        return response.ok({
          body: { state: guidedSetupSO.attributes },
        });
      } else {
        return response.ok({
          body: { state: guidedSetupDefaultState },
        });
      }
    }
  );

  router.put(
    {
      path: '/api/guided_onboarding/state',
      validate: {
        body: schema.object({
          activeGuide: schema.maybe(schema.string()),
          activeStep: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const activeGuide = request.body.activeGuide;
      const activeStep = request.body.activeStep;
      const attributes = {
        activeGuide: activeGuide ?? 'unset',
        activeStep: activeStep ?? 'unset',
      };
      const coreContext = await context.core;
      const soClient = coreContext.savedObjects.client as SavedObjectsClient;

      const stateExists = await doesGuidedSetupExist(soClient);

      if (stateExists) {
        const updatedGuidedSetupSO = await soClient.update(
          guidedSetupSavedObjectsType,
          guidedSetupSavedObjectsId,
          attributes
        );
        return response.ok({
          body: { state: updatedGuidedSetupSO.attributes },
        });
      } else {
        const guidedSetupSO = await soClient.create(
          guidedSetupSavedObjectsType,
          {
            ...guidedSetupDefaultState,
            ...attributes,
          },
          {
            id: guidedSetupSavedObjectsId,
          }
        );

        return response.ok({
          body: {
            state: guidedSetupSO.attributes,
          },
        });
      }
    }
  );
}
