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

import { Server } from 'hapi';
import { CspConfig } from '../../../../../../core/server';
import { UsageCollectionSetup } from '../../../../../../plugins/usage_collection/server';

export function createCspCollector(server: Server) {
  return {
    type: 'csp',
    isReady: () => true,
    async fetch() {
      const { strict, warnLegacyBrowsers, header } = server.newPlatform.setup.core.http.csp;

      return {
        strict,
        warnLegacyBrowsers,
        // It's important that we do not send the value of csp.header here as it
        // can be customized with values that can be identifiable to given
        // installs, such as URLs
        rulesChangedFromDefault: header !== CspConfig.DEFAULT.header,
      };
    },
  };
}

export function registerCspCollector(usageCollection: UsageCollectionSetup, server: Server): void {
  const collector = usageCollection.makeUsageCollector(createCspCollector(server));
  usageCollection.registerCollector(collector);
}
