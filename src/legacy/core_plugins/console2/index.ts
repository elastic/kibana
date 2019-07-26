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

import { first } from 'rxjs/operators';
import url from 'url';
import { head } from 'lodash';
import { LegacyPluginApi } from '../../plugin_discovery/types';

// eslint-disable-next-line
export default function(kibana: LegacyPluginApi) {
  let defaultVars: any;
  return new kibana.Plugin({
    id: 'console2',
    require: ['elasticsearch'],

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    uiCapabilities: () => ({
      catalogue: {},
      management: {},
      navLinks: {},
      dev_tools: {
        show: true,
        save: true,
      },
    }),

    async init(server) {
      const legacyEsConfig = await (server as any).newPlatform.setup.core.elasticsearch.legacy.config$
        .pipe(first())
        .toPromise();
      defaultVars = {
        elasticsearchUrl: url.format(
          Object.assign(url.parse(head(legacyEsConfig.hosts)), { auth: false })
        ),
      };
    },

    uiExports: {
      devTools: ['plugins/console2/shim'],
      injectDefaultVars: () => defaultVars,
    },
  });
}
