/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor, SavedObjectsFindOptions } from '@kbn/core/server';
import { DataViewsService } from '../../../common';
import { handleErrors } from './util/handle_errors';
import type {
  DataViewsServerPluginStartDependencies,
  DataViewsServerPluginStart,
} from '../../types';
import { DATA_VIEW_SWAP_REFERENCES_PATH, INITIAL_REST_VERSION } from '../../constants';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../../../common/constants';

interface GetDataViewArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
  id: string;
}

interface SwapRefResponse {
  result: Array<{ id: string; type: string }>;
  preview: boolean;
  deleteSuccess?: boolean;
}

export const swapReference = async ({
  dataViewsService,
  usageCollection,
  counterName,
  id,
}: GetDataViewArgs) => {
  usageCollection?.incrementCounter({ counterName });
  return dataViewsService.get(id);
};

const idSchema = schema.string();

export const swapReferencesRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >,
  usageCollection?: UsageCounter
) => {
  router.versioned.post({ path: DATA_VIEW_SWAP_REFERENCES_PATH, access: 'public' }).addVersion(
    {
      version: INITIAL_REST_VERSION,
      validate: {
        request: {
          body: schema.object({
            from_id: idSchema,
            from_type: schema.maybe(schema.string()),
            to_id: idSchema,
            for_id: schema.maybe(schema.oneOf([idSchema, schema.arrayOf(idSchema)])),
            for_type: schema.maybe(schema.string()),
            preview: schema.maybe(schema.boolean()),
            delete: schema.maybe(schema.boolean()),
          }),
        },
        response: {
          200: {
            body: schema.object({
              result: schema.arrayOf(schema.object({ id: idSchema, type: schema.string() })),
              preview: schema.boolean(),
              deleteSuccess: schema.maybe(schema.boolean()),
            }),
          },
        },
      },
    },
    router.handleLegacyErrors(
      handleErrors(async (ctx, req, res) => {
        const savedObjectsClient = (await ctx.core).savedObjects.client;
        const [core] = await getStartServices();
        const types = core.savedObjects.getTypeRegistry().getAllTypes();
        const type = req.body.from_type || DATA_VIEW_SAVED_OBJECT_TYPE;
        const preview = req.body.preview !== undefined ? req.body.preview : true;
        const searchId =
          !Array.isArray(req.body.for_id) && req.body.for_id !== undefined
            ? [req.body.for_id]
            : req.body.for_id;

        usageCollection?.incrementCounter({ counterName: 'swap_references' });

        // verify 'to' object actually exists
        try {
          await savedObjectsClient.get(type, req.body.to_id);
        } catch (e) {
          throw new Error(`Could not find object with type ${type} and id ${req.body.to_id}`);
        }

        // assemble search params
        const findParams: SavedObjectsFindOptions = {
          type: types.map((t) => t.name),
          hasReference: { type, id: req.body.from_id },
        };

        if (req.body.for_type) {
          findParams.type = [req.body.for_type];
        }

        const { saved_objects: savedObjects } = await savedObjectsClient.find(findParams);

        const filteredSavedObjects = searchId
          ? savedObjects.filter((so) => searchId?.includes(so.id))
          : savedObjects;

        // create summary of affected objects
        const resultSummary = filteredSavedObjects.map((savedObject) => ({
          id: savedObject.id,
          type: savedObject.type,
        }));

        const body: SwapRefResponse = {
          result: resultSummary,
          preview,
        };

        // bail if preview
        if (preview) {
          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
            body,
          });
        }

        // iterate over list and update references
        for (const savedObject of filteredSavedObjects) {
          const updatedRefs = savedObject.references.map((ref) => {
            if (ref.type === type && ref.id === req.body.from_id) {
              return { ...ref, id: req.body.to_id };
            } else {
              return ref;
            }
          });

          await savedObjectsClient.update(
            savedObject.type,
            savedObject.id,
            {},
            {
              references: updatedRefs,
            }
          );
        }

        if (req.body.delete) {
          const verifyNoMoreRefs = await savedObjectsClient.find(findParams);
          if (verifyNoMoreRefs.total > 0) {
            body.deleteSuccess = false;
          } else {
            await savedObjectsClient.delete(type, req.body.from_id);
            body.deleteSuccess = true;
          }
        }

        return res.ok({
          headers: {
            'content-type': 'application/json',
          },
          body,
        });
      })
    )
  );
};
