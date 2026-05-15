/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { schema } from '@kbn/config-schema';
import type { IRouter, StartServicesAccessor, SavedObjectsFindOptions } from '@kbn/core/server';
import type { DataViewsService } from '../../../common';
import { handleErrors } from './util/handle_errors';
import type {
  DataViewsServerPluginStartDependencies,
  DataViewsServerPluginStart,
} from '../../types';
import {
  DATA_VIEW_SWAP_REFERENCES_PATH,
  INITIAL_REST_VERSION,
  PREVIEW_SWAP_REFERENCES_SUMMARY,
  PREVIEW_SWAP_REFERENCES_DESCRIPTION,
  SWAP_REFERENCES_SUMMARY,
  SWAP_REFERENCES_DESCRIPTION,
} from '../../constants';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../../../common/constants';

interface GetDataViewArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
  id: string;
}

interface SwapRefResponse {
  result: Array<{ id: string; type: string }>;
  deleteStatus?: {
    remainingRefs: number;
    deletePerformed: boolean;
  };
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

export const swapReferencesRoute =
  ({ previewRoute }: { previewRoute: boolean }) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    const path = previewRoute
      ? `${DATA_VIEW_SWAP_REFERENCES_PATH}/_preview`
      : DATA_VIEW_SWAP_REFERENCES_PATH;
    const summary = previewRoute ? PREVIEW_SWAP_REFERENCES_SUMMARY : SWAP_REFERENCES_SUMMARY;
    const description = previewRoute
      ? PREVIEW_SWAP_REFERENCES_DESCRIPTION
      : SWAP_REFERENCES_DESCRIPTION;
    router.versioned
      .post({
        path,
        access: 'public',
        summary,
        description,
        security: {
          authz: {
            enabled: false,
            // We don't use the indexPatterns:manage privilege for this route because it can be used for saved object
            // types other than index-pattern
            reason: 'Authorization provided by saved objects client',
          },
        },
      })
      .addVersion(
        {
          version: INITIAL_REST_VERSION,
          validate: {
            request: {
              body: schema.object({
                fromId: schema.string({
                  meta: {
                    description: 'The identifier of the saved object to swap references from.',
                  },
                }),
                fromType: schema.maybe(
                  schema.string({
                    meta: {
                      description:
                        'The saved object type of the source. Defaults to `index-pattern` (data view).',
                    },
                  })
                ),
                toId: schema.string({
                  meta: {
                    description: 'The identifier of the saved object to swap references to.',
                  },
                }),
                forId: schema.maybe(
                  schema.oneOf([idSchema, schema.arrayOf(idSchema)], {
                    meta: {
                      description:
                        'Limit the swap to specific saved objects. Can be a single ID or an array of IDs.',
                    },
                  })
                ),
                forType: schema.maybe(
                  schema.string({
                    meta: {
                      description:
                        'Limit the swap to saved objects of a specific type, such as `dashboard` or `visualization`.',
                    },
                  })
                ),
                delete: schema.maybe(
                  schema.boolean({
                    meta: {
                      description:
                        'When `true`, deletes the source saved object after all references are swapped. ' +
                        'The delete only occurs if no remaining references point to the source.',
                    },
                  })
                ),
              }),
            },
            response: {
              200: {
                body: () =>
                  schema.object({
                    result: schema.arrayOf(
                      schema.object({
                        id: schema.string({
                          meta: { description: 'The identifier of the affected saved object.' },
                        }),
                        type: schema.string({
                          meta: { description: 'The type of the affected saved object.' },
                        }),
                      }),
                      {
                        meta: {
                          description:
                            'The list of saved objects whose references were updated (or would be updated in a preview).',
                        },
                      }
                    ),
                    deleteStatus: schema.maybe(
                      schema.object({
                        remainingRefs: schema.number({
                          meta: {
                            description:
                              'The number of remaining references pointing to the source saved object.',
                          },
                        }),
                        deletePerformed: schema.boolean({
                          meta: {
                            description: 'Whether the source saved object was deleted.',
                          },
                        }),
                      })
                    ),
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
            const type = req.body.fromType || DATA_VIEW_SAVED_OBJECT_TYPE;
            const searchId =
              !Array.isArray(req.body.forId) && req.body.forId !== undefined
                ? [req.body.forId]
                : req.body.forId;

            usageCollection?.incrementCounter({ counterName: 'swap_references' });

            // verify 'to' object actually exists
            try {
              await savedObjectsClient.get(type, req.body.toId);
            } catch (e) {
              throw new Error(`Could not find object with type ${type} and id ${req.body.toId}`);
            }

            // assemble search params
            const findParams: SavedObjectsFindOptions = {
              type: types.map((t) => t.name),
              hasReference: { type, id: req.body.fromId },
            };

            if (req.body.forType) {
              findParams.type = [req.body.forType];
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
            };

            // bail if preview
            if (previewRoute) {
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
                if (ref.type === type && ref.id === req.body.fromId) {
                  return { ...ref, id: req.body.toId };
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
                body.deleteStatus = {
                  remainingRefs: verifyNoMoreRefs.total,
                  deletePerformed: false,
                };
              } else {
                await savedObjectsClient.delete(type, req.body.fromId, { refresh: 'wait_for' });
                body.deleteStatus = {
                  remainingRefs: verifyNoMoreRefs.total,
                  deletePerformed: true,
                };
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
