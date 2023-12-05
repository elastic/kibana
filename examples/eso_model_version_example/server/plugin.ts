/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// This is an example plugin to demonstrate implementation of an encrypted saved object with model versions using   //
// the new encryptedSavedObjectsPlugin.createModelVersion API.                                                      //
//                                                                                                                  //
// A good place to start is by reviewing the definitions in examples/eso_model_version_example/server/types. This   //
// is where the interfaces and constants for the example saved object are defined.                                  //
//                                                                                                                  //
// In this file (plugin.ts) the model versions are defined, which include typical changes you might see in a saved  //
// object over time, only in this case the model version definitions are wrapped by the new createModelVersion API. //
//                                                                                                                  //
// Lastly, use the plugin UI to get a sense for how the objects are migrated - you can query the raw documents and  //
// the decrypted migrated objects.                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import {
  CoreSetup,
  IRouter,
  Plugin,
  RequestHandlerContext,
  SavedObjectsBulkResponse,
} from '@kbn/core/server';

import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import { schema } from '@kbn/config-schema';

import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';

import {
  esoModelVersionExampleV1,
  esoModelVersionExampleV2,
  esoModelVersionExampleV3,
} from './types';

import { EsoModelVersionExampleTypeRegistration, EXAMPLE_SAVED_OBJECT_TYPE } from './types/latest';

const documentVersionConstants = [
  esoModelVersionExampleV1.ESO_MV_RAW_DOC,
  esoModelVersionExampleV2.ESO_MV_RAW_DOC,
  esoModelVersionExampleV3.ESO_MV_RAW_DOC,
];

export interface EsoModelVersionExamplePluginSetup {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  spaces: SpacesPluginSetup;
}

export interface EsoModelVersionExamplePluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export class EsoModelVersionExample implements Plugin<void, void> {
  public setup(
    core: CoreSetup<EsoModelVersionExamplePluginsStart>,
    plugins: EsoModelVersionExamplePluginSetup
  ) {
    // Register some endoints for the example plugin
    const router = core.http.createRouter();
    this.registerGenerateEndpoint(router); // This will create three objects - one for each model version definition.
    this.registerReadRawEndpoint(router); // This will read the objects' raw documents with an Elasticsearch client.
    this.registerGetObjectsEndpoint(router); // This will read the migrated objects with an SO client.
    this.registerGetDecryptedEndpoint(router, core, plugins); // This will decrypt the objects' secrets.

    // register type as ESO using the latest definition
    plugins.encryptedSavedObjects.registerType(EsoModelVersionExampleTypeRegistration);

    // Register the SO with model versions
    core.savedObjects.registerType({
      name: EXAMPLE_SAVED_OBJECT_TYPE,
      hidden: false,
      namespaceType: 'multiple-isolated',
      mappings: {
        dynamic: false,
        properties: {
          name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
        },
      },
      modelVersions: {
        1: plugins.encryptedSavedObjects.createModelVersion({
          modelVersion: {
            // It is required to define at least one change to use the 'createModelVersion' wrapper, so we will define a no-op transform
            changes: [
              {
                type: 'unsafe_transform',
                transformFn: (document) => {
                  return { document };
                },
              },
            ],
            schemas: {
              forwardCompatibility: schema.object(
                {
                  name: schema.string(),
                  toBeRemoved: schema.string(),
                  aadField1: schema.maybe(schema.object({ flag1: schema.maybe(schema.boolean()) })),
                  secrets: schema.any(),
                },
                // 'ignore' will strip any new unknown fields coming from new versions (a zero-downtime upgrade consideration)
                // We want to do this unless we have a compelling reason not to, like if we know we want to add a new AAD field
                // in the next version (see model version 2)
                { unknowns: 'ignore' }
              ),
              create: schema.object({
                name: schema.string(),
                toBeRemoved: schema.string(),
                aadField1: schema.maybe(schema.object({ flag1: schema.maybe(schema.boolean()) })),
                secrets: schema.any(),
              }),
            },
          },
          inputType: esoModelVersionExampleV1.EsoModelVersionExampleTypeRegistration, // Pass in the type registration for the specific version
          outputType: esoModelVersionExampleV1.EsoModelVersionExampleTypeRegistration, // In this case both input an output are V1
          shouldTransformIfDecryptionFails: true,
        }),
        2: plugins.encryptedSavedObjects.createModelVersion({
          modelVersion: {
            changes: [
              // Version 2 adds additional optional properties (or "sub-fields") to aadField1 and secrets, we're going to back fill them.
              // Version 2 also adds an optional field aadExcludedField, which is excluded from AAD. This will be stripped out for
              // older versions during zero-downtime upgrades due to the forwardCompatibility schema in model version 1.
              {
                type: 'data_backfill',
                backfillFn: (doc) => {
                  const aadField1 = doc.attributes.aadField1;
                  const secrets = doc.attributes.secrets;
                  return {
                    attributes: {
                      aadField1: { ...aadField1, flag2: false },
                      secrets: {
                        ...secrets,
                        b: "model version 2 adds property 'b' to the secrets attribute",
                      },
                    },
                  };
                },
              },
            ],
            schemas: {
              forwardCompatibility: schema.object(
                {
                  name: schema.string(),
                  toBeRemoved: schema.string(),
                  aadField1: schema.maybe(
                    schema.object({
                      flag1: schema.maybe(schema.boolean()),
                      flag2: schema.maybe(schema.boolean()),
                    })
                  ),
                  aadExcludedField: schema.maybe(schema.string()),
                  secrets: schema.any(),
                },
                // If we know that we will be adding a new AAD field in the next version, we will NOT strip new fields
                // in the forward compatibility schema. This is a Zero-downtime upgrade consideration and ensures that
                // old versions will use those fields when constructing AAD. The caveat is that we need to know ahead
                // of time, and make sure the an consuming code can handle having the additional attribute, even if it
                // is not used yet.
                { unknowns: 'allow' }
              ),
              create: schema.object({
                name: schema.string(),
                toBeRemoved: schema.string(),
                aadField1: schema.maybe(
                  schema.object({
                    flag1: schema.maybe(schema.boolean()),
                    flag2: schema.maybe(schema.boolean()),
                  })
                ),
                aadExcludedField: schema.maybe(schema.string()),
                secrets: schema.any(),
              }),
            },
          },
          inputType: esoModelVersionExampleV1.EsoModelVersionExampleTypeRegistration, // In this case we are expecting to transform from a V1 object
          outputType: esoModelVersionExampleV2.EsoModelVersionExampleTypeRegistration, // to a V2 object
          shouldTransformIfDecryptionFails: true,
        }),
        3: plugins.encryptedSavedObjects.createModelVersion({
          modelVersion: {
            // Version 3 adds a new attribute aadField2 which is included in AAD, we're not going to back fill it.
            // For zero-downtime this new attribute is ok, because the previous model version allows unknown fields and will not strip it.
            // The previous version will include it by default whrn constructing AAD.
            changes: [
              {
                type: 'data_removal',
                removedAttributePaths: ['toBeRemoved'],
              },
            ],
            schemas: {
              forwardCompatibility: schema.object(
                {
                  name: schema.string(),
                  aadField1: schema.maybe(
                    schema.object({
                      flag1: schema.maybe(schema.boolean()),
                      flag2: schema.maybe(schema.boolean()),
                    })
                  ),
                  aadField2: schema.maybe(
                    schema.object({
                      foo: schema.maybe(schema.string()),
                      bar: schema.maybe(schema.string()),
                    })
                  ),
                  aadExcludedField: schema.maybe(schema.string()),
                  secrets: schema.any(),
                },
                // We will ignore any new fields of future versions again
                { unknowns: 'ignore' }
              ),
              create: schema.object({
                name: schema.string(),
                aadField1: schema.maybe(
                  schema.object({
                    flag1: schema.maybe(schema.boolean()),
                    flag2: schema.maybe(schema.boolean()),
                  })
                ),
                aadField2: schema.maybe(
                  schema.object({
                    foo: schema.maybe(schema.string()),
                    bar: schema.maybe(schema.string()),
                  })
                ),
                aadExcludedField: schema.maybe(schema.string()),
                secrets: schema.any(),
              }),
            },
          },
          inputType: esoModelVersionExampleV2.EsoModelVersionExampleTypeRegistration, // In this case we are expecting to transform from V2 to V3. This happens to be the latest
          outputType: esoModelVersionExampleV3.EsoModelVersionExampleTypeRegistration, // version, but being explicit means we don't need to change this when we implement V4
          shouldTransformIfDecryptionFails: true,
        }),
      },
    });
  }

  start() {
    return {};
  }

  // This will create three objects - one for each model version definition.
  private registerGenerateEndpoint(router: IRouter<RequestHandlerContext>) {
    router.get(
      {
        path: '/internal/eso_mv_example/generate',
        validate: false,
      },
      async (context, request, response) => {
        const { elasticsearch } = await context.core;

        // Try to delete the documents in case they already exist
        try {
          await Promise.all(
            documentVersionConstants.map(async (obj) => {
              await elasticsearch.client.asInternalUser.delete({
                id: obj.id,
                index: obj.index,
              });
            })
          );
        } catch (error) {
          // ignore errors - objects may not exist
        }

        // Save raw docs for all three versions, so we can decrypt them and inspect
        try {
          const objectsCreated = await Promise.all(
            documentVersionConstants.map(async (obj) => {
              const createdDoc: WriteResponseBase =
                await elasticsearch.client.asInternalUser.create(obj);
              const parts = createdDoc._id.split(':', 2);
              return { type: parts[0], id: parts[1] };
            })
          );

          return response.ok({
            body: {
              objectsCreated,
            },
          });
        } catch (error) {
          return response.ok({
            body: {
              error,
            },
          });
        }
      }
    );
  }

  // This will read the objects' raw documents with an Elasticsearch client.
  private registerReadRawEndpoint(router: IRouter<RequestHandlerContext>) {
    router.get(
      {
        path: '/internal/eso_mv_example/read_raw',
        validate: false,
      },
      async (context, request, response) => {
        // Read the raw documents so we can display the model versions prior to migration transformations
        const { elasticsearch } = await context.core;
        try {
          const rawDocuments = await Promise.all(
            documentVersionConstants.map(async (obj) => {
              return await elasticsearch.client.asInternalUser.get({
                id: obj.id,
                index: obj.index,
              });
            })
          );

          return response.ok({
            body: {
              rawDocuments,
            },
          });
        } catch (error) {
          return response.ok({
            body: {
              error,
            },
          });
        }
      }
    );
  }

  // This will read the migrated objects with an SO client.
  private registerGetObjectsEndpoint(router: IRouter<RequestHandlerContext>) {
    router.get(
      {
        path: '/internal/eso_mv_example/get_objects',
        validate: false,
      },
      async (context, request, response) => {
        // Get the objects via the SO client so we can display how the objects are migrated via the MV definitions
        const { savedObjects } = await context.core;
        try {
          const bulkGetObjects = documentVersionConstants.map((obj) => {
            const parts = obj.id.split(':', 2);
            return { type: parts[0], id: parts[1] };
          });

          const result: SavedObjectsBulkResponse = await savedObjects.client.bulkGet(
            bulkGetObjects
          );
          return response.ok({
            body: result,
          });
        } catch (error) {
          return response.ok({
            body: {
              error,
            },
          });
        }
      }
    );
  }

  // This will decrypt the objects' secrets.
  private registerGetDecryptedEndpoint(
    router: IRouter<RequestHandlerContext>,
    core: CoreSetup<EsoModelVersionExamplePluginsStart>,
    plugins: EsoModelVersionExamplePluginSetup
  ) {
    router.get(
      {
        path: '/internal/eso_mv_example/get_decrypted',
        validate: false,
      },
      async (context, request, response) => {
        // Decrypt the objects as the internal user so we can display the secrets
        const [, { encryptedSavedObjects }] = await core.getStartServices();
        const spaceId = plugins.spaces.spacesService.getSpaceId(request);
        const namespace = plugins.spaces.spacesService.spaceIdToNamespace(spaceId);
        try {
          const esoClient = encryptedSavedObjects.getClient({
            includedHiddenTypes: [EXAMPLE_SAVED_OBJECT_TYPE],
          });

          const decrypted = await Promise.all(
            documentVersionConstants.map(async (obj) => {
              const parts = obj.id.split(':', 2);
              const dooder = await esoClient.getDecryptedAsInternalUser(parts[0], parts[1], {
                namespace,
              });
              return dooder;
            })
          );

          return response.ok({
            body: decrypted,
          });
        } catch (error) {
          return response.ok({
            body: {
              error,
            },
          });
        }
      }
    );
  }
}
