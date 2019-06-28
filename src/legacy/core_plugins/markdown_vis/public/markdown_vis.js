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

import { MarkdownVisWrapper } from './markdown_vis_controller';
import { i18n } from '@kbn/i18n';
import { visFactory } from 'ui/vis/vis_factory';
import markdownVisParamsTemplate from './markdown_vis_params.html';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { DefaultEditorSize } from 'ui/vis/editor_size';
// we need to load the css ourselves

// we also need to load the controller and used by the template

// register the provider with the visTypes registry so that other know it exists
VisTypesRegistryProvider.register(MarkdownVisProvider);

function MarkdownVisProvider() {
  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return visFactory.createReactVisualization({
    name: 'markdown',
    title: 'Markdown',
    isAccessible: true,
    icon: 'visText',
    description: i18n.translate('markdownVis.markdownDescription', { defaultMessage: 'Create a document using markdown syntax' }),
    visConfig: {
      component: MarkdownVisWrapper,
      defaults: {
        fontSize: 12,
        openLinksInNewTab: false,
        markdown: '',
      }
    },
    editorConfig: {
      optionsTemplate: markdownVisParamsTemplate,
      enableAutoApply: true,
      defaultSize: DefaultEditorSize.LARGE,
    },
    options: {
      showTimePicker: false,
      showFilterBar: false,
    },
    requestHandler: 'none',
    responseHandler: 'none',
  });
}

// export the provider so that the visType can be required with Private()
export default MarkdownVisProvider;
