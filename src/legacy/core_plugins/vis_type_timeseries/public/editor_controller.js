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
import { fetchIndexPatternFields } from './lib/fetch_fields';
import { getSavedObjectsClient, getUISettings, getI18n } from './services';

export class EditorController {
  constructor(el, savedObj) {
    this.el = el;

    this.state = {
      savedObj: savedObj,
      vis: savedObj.vis,
      isLoaded: false,
    };
  }

  fetchDefaultIndexPattern = async () => {
    const indexPattern = await getSavedObjectsClient().client.get(
      'index-pattern',
      getUISettings().get('defaultIndex')
    );

    return indexPattern.attributes;
  };

  fetchDefaultParams = async () => {
    const { title, timeFieldName } = await this.fetchDefaultIndexPattern();

    this.state.vis.params.default_index_pattern = title;
    this.state.vis.params.default_timefield = timeFieldName;
    this.state.vis.fields = await fetchIndexPatternFields(this.state.vis);

    this.state.isLoaded = true;
  };

  getComponent = () => {
    return this.state.vis.type.editorConfig.component;
  };

  async render(params) {
    const Component = this.getComponent();
    const I18nContext = getI18n().Context;

    !this.state.isLoaded && (await this.fetchDefaultParams());

    render(
      <I18nContext>
        <Component
          config={getUISettings()}
          vis={this.state.vis}
          visFields={this.state.vis.fields}
          visParams={this.state.vis.params}
          savedObj={this.state.savedObj}
          timeRange={params.timeRange}
          renderComplete={() => {}}
          isEditorMode={true}
          appState={params.appState}
        />
      </I18nContext>,
      this.el
    );
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}
