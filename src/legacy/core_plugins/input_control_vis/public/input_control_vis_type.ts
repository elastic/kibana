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

import { createInputControlVisController } from './vis_controller';
import { getControlsTab } from './components/editor/controls_tab';
import { OptionsTab } from './components/editor/options_tab';
import { Status, defaultFeedbackMessage } from '../../visualizations/public';
import { InputControlVisDependencies } from './plugin';

export function createInputControlVisTypeDefinition(deps: InputControlVisDependencies) {
  const InputControlVisController = createInputControlVisController(deps);
  const ControlsTab = getControlsTab(deps);

  return {
    name: 'input_control_vis',
    title: i18n.translate('inputControl.register.controlsTitle', {
      defaultMessage: 'Controls',
    }),
    icon: 'visControls',
    description: i18n.translate('inputControl.register.controlsDescription', {
      defaultMessage: 'Create interactive controls for easy dashboard manipulation.',
    }),
    stage: 'experimental',
    requiresUpdateStatus: [Status.PARAMS, Status.TIME],
    feedbackMessage: defaultFeedbackMessage,
    visualization: InputControlVisController,
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
          editor: OptionsTab,
        },
      ],
    },
    requestHandler: 'none',
    responseHandler: 'none',
  };
}
