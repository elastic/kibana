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

import Boom from 'boom';
import { Server } from 'hapi';

export const registerUserActionRoute = (server: Server) => {
  /*
   * Increment a count on an object representing a specific user action.
   */
  server.route({
    path: '/api/user_action/{appName}/{actionType}',
    method: 'POST',
    handler: async (request: any) => {
      const { appName, actionType } = request.params;

      try {
        const { getSavedObjectsRepository } = server.savedObjects;
        const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
        const internalRepository = getSavedObjectsRepository(callWithInternalUser);
        const savedObjectId = `${appName}:${actionType}`;

        // This object is created if it doesn't already exist.
        await internalRepository.incrementCounter('user-action', savedObjectId, 'count');

        return {};
      } catch (error) {
        return new Boom('Something went wrong', { statusCode: error.status });
      }
    },
  });
};
