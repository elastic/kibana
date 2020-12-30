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

import { IRouter } from 'kibana/server';
import {
  TelemetrySavedObject,
  TelemetrySavedObjectAttributes,
  getTelemetrySavedObject,
  updateTelemetrySavedObject,
} from '../telemetry_repository';

export function registerTelemetryUserHasSeenNotice(router: IRouter) {
  router.put(
    {
      path: '/api/telemetry/v2/userHasSeenNotice',
      validate: false,
    },
    async (context, req, res) => {
      const internalRepository = context.core.savedObjects.client;
      const telemetrySavedObject: TelemetrySavedObject = await getTelemetrySavedObject(
        internalRepository
      );

      // update the object with a flag stating that the opt-in notice has been seen
      const updatedAttributes: TelemetrySavedObjectAttributes = {
        ...telemetrySavedObject,
        userHasSeenNotice: true,
      };
      await updateTelemetrySavedObject(internalRepository, updatedAttributes);

      return res.ok({ body: updatedAttributes });
    }
  );
}
