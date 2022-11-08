/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import {
  pluginStateSavedObjectsId,
  pluginStateSavedObjectsType,
  PluginStateSO,
} from '../saved_objects';
import { calculateIsActivePeriod, findActiveGuide } from '../helpers';
import { API_BASE_PATH } from '../../common/constants';
import type { PluginState, PluginStatus } from '../../common/types';

export const registerGetPluginState = (router: IRouter) => {
  router.get(
    {
      path: `${API_BASE_PATH}/plugin_state`,
      validate: false,
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const savedObjectsClient = coreContext.savedObjects.client as SavedObjectsClient;

      const pluginStateSO = await savedObjectsClient.find<PluginStateSO>({
        type: pluginStateSavedObjectsType,
      });
      if (pluginStateSO.saved_objects.length === 1) {
        const { status, creationDate } = pluginStateSO.saved_objects[0].attributes;
        const isActivePeriod = calculateIsActivePeriod(creationDate);
        const activeGuideSO = await findActiveGuide(savedObjectsClient);
        const pluginState: PluginState = { status: status as PluginStatus, isActivePeriod };
        if (activeGuideSO.saved_objects.length === 1) {
          pluginState.activeGuide = activeGuideSO.saved_objects[0].attributes;
        }
        return response.ok({
          body: {
            pluginState,
          },
        });
      } else {
        return response.ok({
          body: {
            pluginState: {
              status: 'not_started',
              isActivePeriod: true,
            },
          },
        });
      }
    }
  );
};

export const registerPutPluginState = (router: IRouter) => {
  router.put(
    {
      path: `${API_BASE_PATH}/plugin_state`,
      validate: {
        body: schema.object({
          status: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const updatedPluginState = request.body;

      const coreContext = await context.core;
      const savedObjectsClient = coreContext.savedObjects.client as SavedObjectsClient;

      const { attributes } = await savedObjectsClient.update<PluginStateSO>(
        pluginStateSavedObjectsType,
        pluginStateSavedObjectsId,
        {
          ...updatedPluginState,
        },
        {
          // if there is no saved object yet, insert a new SO with the creation date
          upsert: { ...updatedPluginState, creationDate: new Date() },
        }
      );

      return response.ok({
        body: {
          pluginState: {
            status: attributes.status,
            isActivePeriod: calculateIsActivePeriod(attributes.creationDate),
          },
        },
      });
    }
  );
};
