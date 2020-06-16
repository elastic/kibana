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

import { schema, TypeOf } from '@kbn/config-schema';
import { ServiceConfigDescriptor } from '../internal_types';

export const configSchema = schema.object({
  uiMetric: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    debug: schema.boolean({ defaultValue: schema.contextRef('dev') }),
  }),
  maximumWaitTimeForAllCollectorsInS: schema.number({ defaultValue: 60 }),
});

/**
 * @internal
 */
export type UsageCollectionServiceConfigType = TypeOf<typeof configSchema>;

export const config: ServiceConfigDescriptor<UsageCollectionServiceConfigType> = {
  path: 'usageCollection',
  schema: configSchema,
  // TODO: How to
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('ui_metric.enabled', 'usageCollection.uiMetric.enabled'),
    renameFromRoot('ui_metric.debug', 'usageCollection.uiMetric.debug'),
  ],
  // TODO: How to use this config in a plugin? (will it work out of the box?)
  // exposeToBrowser: {
  //   uiMetric: true,
  // },
};
