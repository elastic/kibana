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

import $ from 'jquery';
import { getVisualizeLoader } from 'ui/visualize/loader';
import { EmbeddableFactory, Embeddable } from 'ui/embeddable';
import { VisualizeEmbeddable } from './visualize_embeddable';

import labDisabledTemplate from './visualize_lab_disabled.html';

export class VisualizeEmbeddableFactory extends EmbeddableFactory {
  constructor(savedVisualizations, config) {
    super();
    this._config = config;
    this.savedVisualizations = savedVisualizations;
    this.name = 'visualization';
  }

  getEditPath(panelId) {
    return this.savedVisualizations.urlFor(panelId);
  }

  /**
   *
   * @param {Object} panelMetadata. Currently just passing in panelState but it's more than we need, so we should
   * decouple this to only include data given to us from the embeddable when it's added to the dashboard. Generally
   * will be just the object id, but could be anything depending on the plugin.
   * @param {function} onEmbeddableStateChanged
   * @return {Promise.<{ metadata, onContainerStateChanged, render, destroy }>}
   */
  create(panelMetadata, onEmbeddableStateChanged) {
    const visId = panelMetadata.id;
    const editUrl = this.getEditPath(visId);

    const waitFor = [ getVisualizeLoader(), this.savedVisualizations.get(visId) ];
    return Promise.all(waitFor)
      .then(([loader, savedObject]) => {
        const isLabsEnabled = this._config.get('visualize:enableLabs');

        if (!isLabsEnabled && savedObject.vis.type.stage === 'lab') {
          return new Embeddable({
            metadata: {
              title: savedObject.title,
            },
            render: (domNode) => {
              const template = $(labDisabledTemplate);
              template.find('.visDisabledLabVisualization__title').text(savedObject.title);
              $(domNode).html(template);
            }
          });
        } else {
          return new VisualizeEmbeddable({
            onEmbeddableStateChanged,
            savedVisualization: savedObject,
            editUrl,
            loader,
          });
        }
      });
  }
}
