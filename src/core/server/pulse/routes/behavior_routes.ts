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
import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';
import { PulseChannel } from '../channel';
import { RegisterRoute } from './types';

export const registerBehaviorRoutes: RegisterRoute = (
  router: IRouter,
  channels: Map<string, PulseChannel>
) => {
  return router.post(
    {
      path: '/api/ui_clicks',
      validate: {
        body: schema.object({
          clicks: schema.arrayOf(
            schema.object({
              timestamp: schema.string(),
              id: schema.maybe(schema.string()),
              class: schema.maybe(schema.string()),
              app: schema.string(),
              sequence: schema.number(),
              sessionHash: schema.string(),
            })
          )
        }),
      }
    },
    async (context, request, response) => {
      const es = context.core.elasticsearch.adminClient;

      const { clicks } = request.body;

      const clickEvents = clicks.map(click => generateClickEvent({
        ...click,
        deploymentId: '123'
      }));

      await Promise.all(clickEvents.map(clickEvent => {
        return es.callAsInternalUser('index', {
          index: 'ui_behaviors',
          body: clickEvent,
        });
      }));

      return response.ok();
    }
  );
};

function generateClickEvent(clickData: any) {
  return {
    '@timestamp': clickData.timestamp,
    ecs: {
      version: '1.4.0',
    },
    labels: {
      deployment_id: clickData.deploymentId,
      elementId: clickData.id,
      elementRef: clickData.ref,
      application: clickData.app,
    },
    event: {
      kind: 'event',
      category: 'ui',
      type: 'info',
      action: 'click',
      created: new Date().toISOString(),
      sequence: clickData.sequence,
    },
    user: {
      hash: clickData.sessionHash,
    },
  };
}
