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

import { VisSavedObject } from 'ui/visualize/loader/types';
import { I18nContext } from 'ui/i18n';
import { EditorRenderProps } from 'src/legacy/core_plugins/kibana/public/visualize/types';
import { DefaultEditor } from './default_editor';
import { DefaultEditorDataTab, OptionTab } from './components/sidebar';
import { EditorStateContextProvider } from './state';

export interface DefaultEditorControllerState {
  savedObj: VisSavedObject;
  optionTabs: OptionTab[];
}

class DefaultEditorController {
  private el: HTMLElement;
  private state: DefaultEditorControllerState;

  constructor(el: HTMLElement, savedObj: VisSavedObject) {
    this.el = el;
    const { type: visType } = savedObj.vis;

    const optionTabs = [
      ...(visType.schemas.buckets || visType.schemas.metrics
        ? [
            {
              name: 'data',
              title: i18n.translate('common.ui.vis.editors.sidebar.tabs.dataLabel', {
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
              title: i18n.translate('common.ui.vis.editors.sidebar.tabs.optionsLabel', {
                defaultMessage: 'Options',
              }),
              editor: visType.editorConfig.optionsTemplate,
            },
          ]
        : visType.editorConfig.optionTabs),
    ];

    this.state = {
      savedObj,
      optionTabs,
    };
  }

  render(props: EditorRenderProps) {
    render(
      <I18nContext>
        <EditorStateContextProvider>
          <DefaultEditor {...this.state} {...props} />
        </EditorStateContextProvider>
      </I18nContext>,
      this.el
    );
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}

export { DefaultEditorController };
