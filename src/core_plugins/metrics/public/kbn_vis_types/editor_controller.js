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
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { FetchFieldsProvider } from '../lib/fetch_fields';
import { extractIndexPatterns } from '../lib/extract_index_patterns';
const AUTO_APPLY_KEY = 'metrics_autoApply';

function ReactEditorControllerProvider(Private, localStorage, config) {
  const fetchFields = Private(FetchFieldsProvider);
  const savedObjectsClient = Private(SavedObjectsClientProvider);

  class ReactEditorController {
    constructor(el, vis) {
      this.el = el;
      this.vis = vis;
      this.vis.fields = {};

      const autoApply = localStorage.get(AUTO_APPLY_KEY);
      vis.autoApply = autoApply != null ? autoApply : true;
      vis.initialized = true;
    }

    render(visData) {
      this.visData = visData;
      return new Promise((resolve) => {
        Promise.resolve().then(() => {
          if (this.vis.params.index_pattern === '') {
            return savedObjectsClient.get('index-pattern', config.get('defaultIndex')).then((indexPattern) => {
              this.vis.params.index_pattern = indexPattern.attributes.title;
            });
          }
        }).then(() => {
          const indexPatterns = extractIndexPatterns(this.vis);
          fetchFields(indexPatterns).then(fields => {
            this.vis.fields = { ...fields, ...this.vis.fields };
            const Component = this.vis.type.editorConfig.component;
            render(<Component config={config} vis={this.vis} visData={visData} renderComplete={resolve}/>, this.el);
          });
        });
      });
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
