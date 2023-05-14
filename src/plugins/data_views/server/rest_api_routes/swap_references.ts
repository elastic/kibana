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
import { DataViewsService } from '../../common';
import { handleErrors } from './util/handle_errors';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../types';
import { DATA_VIEW_SWAP_REFERENCES_PATH } from '../constants';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../../common/constants';

interface GetDataViewArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
  id: string;
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
  router.post(
    {
      path: DATA_VIEW_SWAP_REFERENCES_PATH,
      validate: {
        body: schema.object(
          {
            from_id: idSchema,
            from_type: schema.maybe(schema.string()),
            to: idSchema,
            search_id: schema.maybe(schema.oneOf([idSchema, schema.arrayOf(idSchema)])),
            search_type: schema.maybe(schema.string()),
            preview: schema.maybe(schema.boolean()),
            delete: schema.maybe(schema.boolean()),
          },
          { unknowns: 'forbid' }
        ),
      },
    },
    router.handleLegacyErrors(
      handleErrors(async (ctx, req, res) => {
        const savedObjectsClient = (await ctx.core).savedObjects.client;
        const [core] = await getStartServices();
        const types = core.savedObjects.getTypeRegistry().getAllTypes();
        const type = req.body.from_type || DATA_VIEW_SAVED_OBJECT_TYPE;
        const preview = req.body.preview !== undefined ? req.body.preview : true;
        const searchId = Array.isArray(req.body.search_id)
          ? req.body.search_id.join(' | ')
          : req.body.search_id;

        usageCollection?.incrementCounter({ counterName: 'swap_references' });

        // verify 'to' object actually exists
        try {
          await savedObjectsClient.get(type, req.body.to);
        } catch (e) {
          throw new Error(`Could not find object with type ${type} and id ${req.body.to}`);
        }

        // assemble search params
        const findParams: SavedObjectsFindOptions = {
          type: types.map((t) => t.name),
          hasReference: { type, id: req.body.from_id },
        };

        if (searchId) {
          findParams.searchFields = ['id'];
          findParams.search = searchId;
        }

        if (req.body.search_type) {
          findParams.type = [req.body.search_type];
        }

        const findResult = await savedObjectsClient.find(findParams);

        // create summary of affected objects
        const resultSummary = findResult.saved_objects.map((savedObject) => ({
          id: savedObject.id,
          type: savedObject.type,
        }));

        const response = res.ok({
          headers: {
            'content-type': 'application/json',
          },
          body: {
            result: resultSummary,
            preview,
          },
        });

        if (findResult.total === 0) {
          throw new Error(
            `Could not find any objects based on search criteria: ${JSON.stringify(findParams)}`
          );
        }

        // bail if preview
        if (preview) {
          return response;
        }

        // iterate over list and update references
        for (const savedObject of findResult.saved_objects) {
          const updatedRefs = savedObject.references.map((ref) => {
            if (ref.type === type && ref.id === req.body.from_id) {
              return { ...ref, id: req.body.to };
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
            throw new Error(
              `Could not delete object with type ${type} and id ${req.body.from_id} because it still has references`
            );
          } else {
            await savedObjectsClient.delete(type, req.body.from_id);
          }
        }

        return response;
      })
    )
  );
};
