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

import React from 'react';
import { i18n } from '@kbn/i18n';

import { KibanaContextProvider } from '../../kibana_react/public';
import { DefaultEditorSize } from '../../vis_default_editor/public';
import { getTimelionRequestHandler } from './helpers/timelion_request_handler';
import { TimelionVisComponent, TimelionVisComponentProp } from './components';
import { TimelionOptions, TimelionOptionsProps } from './timelion_options';
import { TimelionVisDependencies } from './plugin';

import { VIS_EVENT_TO_TRIGGER } from '../../visualizations/public';

export const TIMELION_VIS_NAME = 'timelion';

export function getTimelionVisDefinition(dependencies: TimelionVisDependencies) {
  const timelionRequestHandler = getTimelionRequestHandler(dependencies);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return {
    name: TIMELION_VIS_NAME,
    title: 'Timelion',
    icon: 'visTimelion',
    description: i18n.translate('timelion.timelionDescription', {
      defaultMessage: 'Build time-series using functional expressions',
    }),
    visConfig: {
      defaults: {
        expression: '.es(*)',
        interval: 'auto',
      },
      component: (props: TimelionVisComponentProp) => (
        <KibanaContextProvider services={{ ...dependencies }}>
          <TimelionVisComponent {...props} />
        </KibanaContextProvider>
      ),
    },
    editorConfig: {
      optionsTemplate: (props: TimelionOptionsProps) => (
        <KibanaContextProvider services={{ ...dependencies }}>
          <TimelionOptions {...props} />
        </KibanaContextProvider>
      ),
      defaultSize: DefaultEditorSize.MEDIUM,
    },
    requestHandler: timelionRequestHandler,
    responseHandler: 'none',
    inspectorAdapters: {},
    getSupportedTriggers: () => {
      return [VIS_EVENT_TO_TRIGGER.applyFilter];
    },
    options: {
      showIndexSelection: false,
      showQueryBar: false,
      showFilterBar: false,
    },
  };
}
