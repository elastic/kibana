/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IRouter, SavedObjectsClient } from '@kbn/core/server';
import { API_BASE_PATH } from '../../common';
import { findAllGuides } from '../helpers';
import { guideStateSavedObjectsType } from '../saved_objects';

export const registerGetGuideStateRoute = (router: IRouter) => {
  // Fetch all guides state
  router.get(
    {
      path: `${API_BASE_PATH}/guides`,
      validate: false,
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const soClient = coreContext.savedObjects.getClient({
        includedHiddenTypes: [guideStateSavedObjectsType],
      }) as SavedObjectsClient;

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
