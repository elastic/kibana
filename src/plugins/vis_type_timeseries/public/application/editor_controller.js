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
import { getUISettings, getI18n } from '../services';
import { VisEditor } from './components/vis_editor_lazy';

export class EditorController {
  constructor(el, vis, eventEmitter, embeddableHandler) {
    this.el = el;

    this.embeddableHandler = embeddableHandler;
    this.eventEmitter = eventEmitter;

    this.state = {
      vis: vis,
    };
  }

  async render(params) {
    const I18nContext = getI18n().Context;

    render(
      <I18nContext>
        <VisEditor
          config={getUISettings()}
          vis={this.state.vis}
          visParams={this.state.vis.params}
          timeRange={params.timeRange}
          renderComplete={() => {}}
          appState={params.appState}
          embeddableHandler={this.embeddableHandler}
          eventEmitter={this.eventEmitter}
        />
      </I18nContext>,
      this.el
    );
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}
