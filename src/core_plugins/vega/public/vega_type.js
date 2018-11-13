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

import { i18n }  from '@kbn/i18n';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';
import { DefaultEditorSize } from 'ui/vis/editor_size';
import { Status } from 'ui/vis/update_status';
import { defaultFeedbackMessage } from 'ui/vis/default_feedback_message';

import { VegaRequestHandlerProvider } from './vega_request_handler';
import { VegaVisualizationProvider } from './vega_visualization';

// Editor-specific code
import 'brace/mode/hjson';
import 'brace/ext/searchbox';
import './vega_editor_controller';
import vegaEditorTemplate from './vega_editor_template.html';
import defaultSpec from '!!raw-loader!./default.spec.hjson';

VisTypesRegistryProvider.register((Private) => {
  const VisFactory = Private(VisFactoryProvider);
  const vegaRequestHandler = Private(VegaRequestHandlerProvider).handler;
  const VegaVisualization = Private(VegaVisualizationProvider);

  return VisFactory.createBaseVisualization({
    name: 'vega',
    title: i18n.translate('vega.type.vegaTitle', {
      defaultMessage: 'Vega',
    }),
    description: i18n.translate('vega.type.vegaВescription', {
      defaultMessage: 'Create custom visualizations using Vega and Vega-Lite',
    }),
    icon: 'visVega',
    category: CATEGORY.OTHER,
    visConfig: { defaults: { spec: defaultSpec } },
    editorConfig: {
      optionsTemplate: vegaEditorTemplate,
      enableAutoApply: true,
      defaultSize: DefaultEditorSize.MEDIUM,
    },
    visualization: VegaVisualization,
    requiresUpdateStatus: [Status.DATA, Status.RESIZE],
    requestHandler: vegaRequestHandler,
    responseHandler: 'none',
    options: {
      showIndexSelection: false,
      showQueryBar: true,
      showFilterBar: true,
    },
    stage: 'lab',
    feedbackMessage: defaultFeedbackMessage,
  });
});
