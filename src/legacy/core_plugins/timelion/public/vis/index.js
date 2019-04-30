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

import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { TimelionRequestHandlerProvider } from './timelion_request_handler';
import { DefaultEditorSize } from 'ui/vis/editor_size';

// we also need to load the controller and directive used by the template
import './timelion_vis_controller';
import '../directives/timelion_expression_input';

import visConfigTemplate from './timelion_vis.html';
import editorConfigTemplate from './timelion_vis_params.html';

// register the provider with the visTypes registry so that other know it exists
VisTypesRegistryProvider.register(TimelionVisProvider);

export default function TimelionVisProvider(Private, i18n) {
  const VisFactory = Private(VisFactoryProvider);
  const timelionRequestHandler = Private(TimelionRequestHandlerProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return VisFactory.createAngularVisualization({
    name: 'timelion',
    title: 'Timelion',
    icon: 'visTimelion',
    description: i18n('timelion.timelionDescription', {
      defaultMessage: 'Build time-series using functional expressions',
    }),
    visConfig: {
      defaults: {
        expression: '.es(*)',
        interval: 'auto'
      },
      template: visConfigTemplate,
    },
    editorConfig: {
      optionsTemplate: editorConfigTemplate,
      defaultSize: DefaultEditorSize.MEDIUM,
    },
    requestHandler: timelionRequestHandler.handler,
    responseHandler: 'none',
    options: {
      showIndexSelection: false,
      showQueryBar: false,
      showFilterBar: false,
    },
  });
}
