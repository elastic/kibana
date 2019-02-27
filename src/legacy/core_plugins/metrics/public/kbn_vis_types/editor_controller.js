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
import { I18nContext } from 'ui/i18n';
import chrome from 'ui/chrome';
import { extractIndexPatterns } from '../lib/extract_index_patterns';
import { fetchFields } from '../lib/fetch_fields';

function ReactEditorControllerProvider(Private, config) {
  class ReactEditorController {
    constructor(el, savedObj) {
      this.el = el;
      this.savedObj = savedObj;
      this.vis = savedObj.vis;
      this.vis.fields = {};
    }

    fetchIndexPatternFields = async () => {
      const { params, fields } = this.vis;
      const indexPatterns = extractIndexPatterns(params, fields);
      const updatedFields = await fetchFields(indexPatterns);
      this.vis.fields = { ...this.vis.fields, ...updatedFields };
      return this.vis.fields;
    };


    setDefaultIndexPattern = async () => {
      if (this.vis.params.index_pattern === '') {
        // set the default index pattern if none is defined.
        const savedObjectsClient = chrome.getSavedObjectsClient();
        const indexPattern = await savedObjectsClient.get('index-pattern', config.get('defaultIndex'));
        const defaultIndexPattern = indexPattern.attributes.title;
        this.vis.params.index_pattern = defaultIndexPattern;
      }
    };

    async render(params) {
      const Component = this.vis.type.editorConfig.component;

      await this.setDefaultIndexPattern();
      await this.fetchIndexPatternFields();

      render(
        <I18nContext>
          <Component
            config={config}
            vis={this.vis}
            savedObj={this.savedObj}
            timeRange={params.timeRange}
            renderComplete={() => {}}
            isEditorMode={true}
            appState={params.appState}
            fetchIndexPatternFields={this.fetchIndexPatternFields}
          />
        </I18nContext>,
        this.el);
    }

    resize() {
      if (this.visData) {
        this.render(this.visData);
      }
    }

    destroy() {
      unmountComponentAtNode(this.el);
    }
  }

  return {
    name: 'react_editor',
    handler: ReactEditorController
  };
}

export { ReactEditorControllerProvider };
