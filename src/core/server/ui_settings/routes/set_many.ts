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
import { schema, ValidationError } from '@kbn/config-schema';

import { IRouter } from '../../http';
import { SavedObjectsErrorHelpers } from '../../saved_objects';
import { CannotOverrideError } from '../ui_settings_errors';

const validate = {
  body: schema.object({
    changes: schema.object({}, { unknowns: 'allow' }),
  }),
};

export function registerSetManyRoute(router: IRouter) {
  router.post({ path: '/api/kibana/settings', validate }, async (context, request, response) => {
    try {
      const uiSettingsClient = context.core.uiSettings.client;

      const { changes } = request.body;

      await uiSettingsClient.setMany(changes);

      return response.ok({
        body: {
          settings: await uiSettingsClient.getUserProvided(),
        },
      });
    } catch (error) {
      if (SavedObjectsErrorHelpers.isSavedObjectsClientError(error)) {
        return response.customError({
          body: error,
          statusCode: error.output.statusCode,
        });
      }

      if (error instanceof CannotOverrideError || error instanceof ValidationError) {
        return response.badRequest({ body: error });
      }

      throw error;
    }
  });
}
