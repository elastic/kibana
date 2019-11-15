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

import 'brace';
import 'brace/ext/language_tools';
import 'brace/ext/searchbox';
import 'brace/mode/json';
import 'brace/mode/text';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { npSetup, npStart } from 'ui/new_platform';
import { I18nContext } from 'ui/i18n';
/* eslint-enable @kbn/eslint/no-restricted-paths */

export interface XPluginSet {
  devTools: DevToolsSetup;
  feature_catalogue: FeatureCatalogueSetup;
  __LEGACY: {
    I18nContext: any;
  };
}

import { plugin } from '.';
import { DevToolsSetup } from '../../../../../plugins/dev_tools/public';
import { FeatureCatalogueSetup } from '../../../../../plugins/feature_catalogue/public';

const pluginInstance = plugin({} as any);

pluginInstance.setup(npSetup.core, {
  ...npSetup.plugins,
  __LEGACY: {
    I18nContext,
  },
});
pluginInstance.start(npStart.core);
