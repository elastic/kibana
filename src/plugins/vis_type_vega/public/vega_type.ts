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
import { DefaultEditorSize } from '../../vis_default_editor/public';
import { VegaVisualizationDependencies } from './plugin';
import { VegaVisEditor } from './components';

import { createVegaRequestHandler } from './vega_request_handler';
// @ts-expect-error
import { createVegaVisualization } from './vega_visualization';
import { getDefaultSpec } from './default_spec';
import { createInspectorAdapters } from './vega_inspector';
import { VIS_EVENT_TO_TRIGGER } from '../../visualizations/public';

export const createVegaTypeDefinition = (dependencies: VegaVisualizationDependencies) => {
  const requestHandler = createVegaRequestHandler(dependencies);
  const visualization = createVegaVisualization(dependencies);

  return {
    name: 'vega',
    title: 'Vega',
    description: i18n.translate('visTypeVega.type.vegaDescription', {
      defaultMessage: 'Create custom visualizations using Vega and Vega-Lite',
      description: 'Vega and Vega-Lite are product names and should not be translated',
    }),
    icon: 'visVega',
    visConfig: { defaults: { spec: getDefaultSpec() } },
    editorConfig: {
      optionsTemplate: VegaVisEditor,
      enableAutoApply: true,
      defaultSize: DefaultEditorSize.MEDIUM,
    },
    visualization,
    requestHandler,
    responseHandler: 'none',
    options: {
      showIndexSelection: false,
      showQueryBar: true,
      showFilterBar: true,
    },
    getSupportedTriggers: () => {
      return [VIS_EVENT_TO_TRIGGER.applyFilter];
    },
    inspectorAdapters: createInspectorAdapters,
  };
};
