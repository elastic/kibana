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

import { resolve } from 'path';
import { Legacy } from '../../../../kibana';
import { init } from './init';

// eslint-disable-next-line
export default function InterpreterPlugin(kibana: any) {
  const config: Legacy.PluginSpecOptions = {
    id: 'interpreter',
    require: ['kibana', 'elasticsearch'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      injectDefaultVars: server => ({
        serverBasePath: server.config().get('server.basePath'),
      }),
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
    },
    config: (Joi: any) => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },
    init,
  };

  return new kibana.Plugin(config);
}
