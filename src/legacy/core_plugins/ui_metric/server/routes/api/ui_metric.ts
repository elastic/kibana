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
import { API_BASE_PATH } from '../../../common';

export const registerUserActionRoute = (server: Server) => {
  /*
   * Increment a count on an object representing a specific interaction with the UI.
   */
  server.route({
    path: `${API_BASE_PATH}/{appName}/{metricTypes}`,
    method: 'POST',
    handler: async (request: any) => {
      const { appName, metricTypes } = request.params;

      try {
        const { getSavedObjectsRepository } = server.savedObjects;
        const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
        const internalRepository = getSavedObjectsRepository(callWithInternalUser);

        const incrementRequests = metricTypes.split(',').map((metricType: string) => {
          const savedObjectId = `${appName}:${metricType}`;
          // This object is created if it doesn't already exist.
          return internalRepository.incrementCounter('ui-metric', savedObjectId, 'count');
        });

        await Promise.all(incrementRequests);
        return {};
      } catch (error) {
        return new Boom('Something went wrong', { statusCode: error.status });
      }
    },
  });
};
