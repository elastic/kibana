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

import { Legacy } from 'kibana';
import { Request } from 'hapi';
import { CoreSetup } from 'src/core/server';
import {
  TelemetrySavedObject,
  TelemetrySavedObjectAttributes,
  getTelemetrySavedObject,
  updateTelemetrySavedObject,
} from '../telemetry_repository';

const getInternalRepository = (server: Legacy.Server) => {
  const { getSavedObjectsRepository } = server.savedObjects;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);
  return internalRepository;
};

export function registerTelemetryUserHasSeenNotice(core: CoreSetup) {
  const { server }: { server: Legacy.Server } = core.http as any;

  server.route({
    method: 'PUT',
    path: '/api/telemetry/v2/userHasSeenNotice',
    handler: async (req: Request): Promise<TelemetrySavedObjectAttributes> => {
      const internalRepository = getInternalRepository(server);
      const telemetrySavedObject: TelemetrySavedObject = await getTelemetrySavedObject(
        internalRepository
      );

      // update the object with a flag stating that the opt-in notice has been seen
      const updatedAttributes: TelemetrySavedObjectAttributes = {
        ...telemetrySavedObject,
        userHasSeenNotice: true,
      };
      await updateTelemetrySavedObject(internalRepository, updatedAttributes);

      return updatedAttributes;
    },
  });
}
