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

import { EmbeddableFactory } from 'ui/embeddable';
import { getVisualizeLoader } from 'ui/visualize/loader';
import { VisualizeEmbeddable } from './visualize_embeddable';

import { Legacy } from 'kibana';
import { OnEmbeddableStateChanged } from 'ui/embeddable/embeddable_factory';
import { getIndexPattern } from 'ui/embeddable/get_index_pattern';
import { SavedVisualizations } from '../types';
import { DisabledLabEmbeddable } from './disabled_lab_embeddable';

export interface VisualizeEmbeddableInstanceConfiguration {
  id: string;
}

export class VisualizeEmbeddableFactory extends EmbeddableFactory {
  private savedVisualizations: SavedVisualizations;
  private config: Legacy.KibanaConfig;

  constructor(savedVisualizations: SavedVisualizations, config: Legacy.KibanaConfig) {
    super({ name: 'visualization' });
    this.config = config;
    this.savedVisualizations = savedVisualizations;
  }

  public getEditPath(panelId: string) {
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
  public async create(
    panelMetadata: VisualizeEmbeddableInstanceConfiguration,
    onEmbeddableStateChanged: OnEmbeddableStateChanged
  ) {
    const visId = panelMetadata.id;
    const editUrl = this.getEditPath(visId);

    const loader = await getVisualizeLoader();
    const savedObject = await this.savedVisualizations.get(visId);
    const isLabsEnabled = this.config.get<boolean>('visualize:enableLabs');

    if (!isLabsEnabled && savedObject.vis.type.stage === 'experimental') {
      return new DisabledLabEmbeddable(savedObject.title);
    }

    const indexPattern = await getIndexPattern(savedObject);
    return new VisualizeEmbeddable({
      onEmbeddableStateChanged,
      savedVisualization: savedObject,
      editUrl,
      loader,
      indexPattern,
    });
  }
}
