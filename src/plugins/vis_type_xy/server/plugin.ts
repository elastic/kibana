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

import { CoreSetup, Plugin, UiSettingsParams } from 'kibana/server';

import { NEW_CHART_UI } from '../common';

export const uiSettingsConfig: Record<string, UiSettingsParams<boolean>> = {
  [NEW_CHART_UI]: {
    name: i18n.translate('visTypeXy.advancedSettings.visualization.newChartUi', {
      defaultMessage: 'New Chart UI',
    }),
    value: false,
    description: i18n.translate('visTypeXy.advancedSettings.visualization.newChartUi', {
      defaultMessage:
        'Enables new chart UI for areas, lines and bars in visualize. Currently, does <strong>not</strong> support split chart aggregation.',
    }),
    category: ['visualization'],
    schema: schema.boolean(),
  },
};

export class VisTypeXyServerPlugin implements Plugin<object, object> {
  public setup(core: CoreSetup) {
    core.uiSettings.register(uiSettingsConfig);

    return {};
  }

  public start() {
    return {};
  }
}
