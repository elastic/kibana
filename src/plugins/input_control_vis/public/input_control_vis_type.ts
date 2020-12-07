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
import { VisGroups, BaseVisTypeOptions } from '../../visualizations/public';
import { getControlsTab, OptionsTabLazy } from './components/editor';
import { InputControlVisDependencies } from './plugin';
import { toExpressionAst } from './to_ast';
import { InputControlVisParams } from './types';

export function createInputControlVisTypeDefinition(
  deps: InputControlVisDependencies
): BaseVisTypeOptions<InputControlVisParams> {
  const ControlsTab = getControlsTab(deps);

  return {
    name: 'input_control_vis',
    title: i18n.translate('inputControl.register.controlsTitle', {
      defaultMessage: 'Controls',
    }),
    icon: 'controlsHorizontal',
    group: VisGroups.TOOLS,
    description: i18n.translate('inputControl.register.controlsDescription', {
      defaultMessage: 'Add dropdown menus and range sliders to your dashboard.',
    }),
    stage: 'experimental',
    visConfig: {
      defaults: {
        controls: [],
        updateFiltersOnChange: false,
        useTimeFilter: false,
        pinFilters: false,
      },
    },
    editorConfig: {
      optionTabs: [
        {
          name: 'controls',
          title: i18n.translate('inputControl.register.tabs.controlsTitle', {
            defaultMessage: 'Controls',
          }),
          editor: ControlsTab,
        },
        {
          name: 'options',
          title: i18n.translate('inputControl.register.tabs.optionsTitle', {
            defaultMessage: 'Options',
          }),
          editor: OptionsTabLazy,
        },
      ],
    },
    inspectorAdapters: {},
    requestHandler: 'none',
    toExpressionAst,
  };
}
