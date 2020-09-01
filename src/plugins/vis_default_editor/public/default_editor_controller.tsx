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

import React, { Suspense, lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { EventEmitter } from 'events';
import { EuiErrorBoundary, EuiLoadingChart } from '@elastic/eui';

import { EditorRenderProps } from 'src/plugins/visualize/public';
import { Vis, VisualizeEmbeddableContract } from 'src/plugins/visualizations/public';
import { DefaultEditorDataTab, OptionTab } from './components/sidebar';

const DefaultEditor = lazy(() => import('./default_editor'));

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

  render(props: EditorRenderProps) {
    render(
      <EuiErrorBoundary>
        <Suspense
          fallback={
            <div
              style={{
                display: 'flex',
                flex: '1 1 auto',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <EuiLoadingChart size="xl" mono />
            </div>
          }
        >
          <DefaultEditor {...this.state} {...props} />
        </Suspense>
      </EuiErrorBoundary>,
      this.el
    );
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}

export { DefaultEditorController };
