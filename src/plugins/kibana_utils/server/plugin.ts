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

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { CoreSetup, Plugin, PluginInitializerContext, Logger } from 'kibana/server';
import { KibanaUtilsPluginSetup, KibanaUtilsPluginStart } from './types';

export class KibanaUtilsPlugin implements Plugin<KibanaUtilsPluginSetup, KibanaUtilsPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public async setup(core: CoreSetup) {
    this.logger.debug('Kibana_utils: Setup');

    core.uiSettings.register({
      'state:storeInSessionStorage': {
        name: i18n.translate('kibana_utils.advancedSettings.storeUrlTitle', {
          defaultMessage: 'Store URLs in session storage',
        }),
        value: false,
        description: i18n.translate('kibana_utils.advancedSettings.storeUrlText', {
          defaultMessage:
            'The URL can sometimes grow to be too large for some browsers to handle. ' +
            'To counter-act this we are testing if storing parts of the URL in session storage could help. ' +
            'Please let us know how it goes!',
        }),
        schema: schema.boolean(),
      },
    });

    return {};
  }

  public start() {
    this.logger.debug('Kibana_utils: Started');

    return {};
  }

  public stop() {}
}
