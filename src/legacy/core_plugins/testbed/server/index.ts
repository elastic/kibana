/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Request } from 'hapi';
import Joi from 'joi';
import { Legacy } from 'kibana';

const SAVED_OBJECT_WITH_SECRET_TYPE = 'saved-object-with-secret';

export function initServer(server: Legacy.Server) {
  server.route({
    method: 'GET',
    path: '/api/testbed/v1/encrypted-saved-objects/find',
    async handler(request: Request) {
      return await server.savedObjects
        .getScopedSavedObjectsClient(request)
        .find({ type: SAVED_OBJECT_WITH_SECRET_TYPE });
    },
  });

  server.route({
    method: 'POST',
    path: '/api/testbed/v1/encrypted-saved-objects/create',
    options: {
      validate: {
        payload: Joi.object().keys({
          publicProperty: Joi.string().required(),
          publicPropertyExcludedFromAAD: Joi.string().required(),
          privateProperty: Joi.string().required(),
        }),
      },
    },
    async handler(request: Request) {
      return await server.savedObjects
        .getScopedSavedObjectsClient(request)
        .create(SAVED_OBJECT_WITH_SECRET_TYPE, request.payload as Record<string, string>);
    },
  });

  server.route({
    method: 'POST',
    path: '/api/testbed/v1/encrypted-saved-objects/update',
    options: {
      validate: {
        payload: Joi.object().keys({
          id: Joi.string().required(),
          publicProperty: Joi.string().optional(),
          publicPropertyExcludedFromAAD: Joi.string().optional(),
          privateProperty: Joi.string().optional(),
        }),
      },
    },
    async handler(request: Request) {
      const {
        id,
        publicProperty,
        publicPropertyExcludedFromAAD,
        privateProperty,
      } = request.payload as any;
      return await server.savedObjects
        .getScopedSavedObjectsClient(request)
        .update(SAVED_OBJECT_WITH_SECRET_TYPE, id, {
          publicProperty,
          publicPropertyExcludedFromAAD,
          privateProperty,
        });
    },
  });

  server.route({
    method: 'DELETE',
    path: '/api/testbed/v1/encrypted-saved-objects/delete/{id}',
    async handler(request: Request) {
      return await server.savedObjects
        .getScopedSavedObjectsClient(request)
        .delete(SAVED_OBJECT_WITH_SECRET_TYPE, request.params.id);
    },
  });

  server.route({
    method: 'GET',
    path: '/api/testbed/v1/encrypted-saved-objects/get/{id}',
    async handler(request: Request) {
      return await server.savedObjects
        .getScopedSavedObjectsClient(request)
        .get(SAVED_OBJECT_WITH_SECRET_TYPE, request.params.id);
    },
  });

  server.route({
    method: 'GET',
    path: '/api/testbed/v1/encrypted-saved-objects/get-decrypted/{id}',
    async handler(request: Request) {
      const namespace = server.plugins.spaces && server.plugins.spaces.getSpaceId(request);
      return await (server.plugins as any).encrypted_saved_objects.getDecryptedAsInternalUser(
        SAVED_OBJECT_WITH_SECRET_TYPE,
        request.params.id,
        { namespace: namespace === 'default' ? undefined : namespace }
      );
    },
  });

  (server.plugins as any).encrypted_saved_objects.registerType({
    type: SAVED_OBJECT_WITH_SECRET_TYPE,
    attributesToEncrypt: new Set(['privateProperty']),
    attributesToExcludeFromAAD: new Set(['publicPropertyExcludedFromAAD']),
  });
}
