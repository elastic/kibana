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
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { EventEmitter } from 'events';

import { EditorRenderProps } from 'src/plugins/visualize/public';
import { Vis, VisualizeEmbeddableContract } from 'src/plugins/visualizations/public';
import { Storage } from '../../kibana_utils/public';
import { KibanaContextProvider } from '../../kibana_react/public';
import { DefaultEditor } from './default_editor';
import { DefaultEditorDataTab, OptionTab } from './components/sidebar';

const localStorage = new Storage(window.localStorage);

export interface DefaultEditorControllerState {
  vis: Vis;
  eventEmitter: EventEmitter;
  embeddableHandler: VisualizeEmbeddableContract;
  optionTabs: OptionTab[];
}

class DefaultEditorController {
  private el: HTMLElement;
  private state: DefaultEditorControllerState;

  constructor(el: HTMLElement, vis: Vis, eventEmitter: EventEmitter, embeddableHandler: any) {
    this.el = el;
    const { type: visType } = vis;

    const optionTabs = [
      ...(visType.schemas.buckets || visType.schemas.metrics
        ? [
            {
              name: 'data',
              title: i18n.translate('visDefaultEditor.sidebar.tabs.dataLabel', {
                defaultMessage: 'Data',
              }),
              editor: DefaultEditorDataTab,
            },
          ]
        : []),

      ...(!visType.editorConfig.optionTabs && visType.editorConfig.optionsTemplate
        ? [
            {
              name: 'options',
              title: i18n.translate('visDefaultEditor.sidebar.tabs.optionsLabel', {
                defaultMessage: 'Options',
              }),
              editor: visType.editorConfig.optionsTemplate,
            },
          ]
        : visType.editorConfig.optionTabs),
    ];

    this.state = {
      vis,
      optionTabs,
      eventEmitter,
      embeddableHandler,
    };
  }

  render({ data, core, ...props }: EditorRenderProps) {
    render(
      <core.i18n.Context>
        <KibanaContextProvider
          services={{
            appName: 'vis_default_editor',
            storage: localStorage,
            data,
            ...core,
          }}
        >
          <DefaultEditor {...this.state} {...props} />
        </KibanaContextProvider>
      </core.i18n.Context>,
      this.el
    );
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}

export { DefaultEditorController };
