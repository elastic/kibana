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

import { VisOptionsProps } from 'ui/vis/editors/default';
import { KibanaContextProvider } from '../../../../plugins/kibana_react/public';
import { DefaultEditorSize } from './legacy_imports';
import { getTimelionRequestHandler } from './helpers/timelion_request_handler';
import { TimelionVisComponent } from './components';
import { TimelionOptions } from './timelion_options';
import { VisParams } from './timelion_vis_fn';
import { TimelionVisDependencies } from './plugin';

export const TIMELION_VIS_NAME = 'timelion';

export function getTimelionVisDefinition(dependencies: TimelionVisDependencies) {
  const { http, uiSettings } = dependencies;
  const timelionRequestHandler = getTimelionRequestHandler();

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
      component: TimelionVisComponent,
    },
    editorConfig: {
      optionsTemplate: (props: VisOptionsProps<VisParams>) => (
        <KibanaContextProvider services={{ uiSettings, http }}>
          <TimelionOptions {...props} />
        </KibanaContextProvider>
      ),
      defaultSize: DefaultEditorSize.MEDIUM,
    },
    requestHandler: timelionRequestHandler,
    responseHandler: 'none',
    options: {
      showIndexSelection: false,
      showQueryBar: false,
      showFilterBar: false,
    },
  };
}
