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

import { CoreStart, CoreSetup } from 'kibana/public';
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';

export class EuiChartUtils {
  public setup(core: CoreSetup) {}
  public start(core: CoreStart) {
    return {
      getChartsTheme() {
        return core.uiSettings.get('theme:darkMode')
          ? EUI_CHARTS_THEME_DARK.theme
          : EUI_CHARTS_THEME_LIGHT.theme;
      },
    };
  }
}
