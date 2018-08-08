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

import { Embeddable } from './embeddable';
import { EmbeddableState } from './types';

/**
 * The EmbeddableFactory creates and initializes an embeddable instance
 */
export abstract class EmbeddableFactory {
  /**
   *
   * @param {{ id: string }} containerMetadata. Currently just passing in panelState but it's more than we need, so we should
   * decouple this to only include data given to us from the embeddable when it's added to the dashboard. Generally
   * will be just the object id, but could be anything depending on the plugin.
   * @param {onEmbeddableStateChanged} onEmbeddableStateChanged - embeddable should call this function with updated
   * state whenever something changes that the dashboard should know about.
   * @return {Promise.<Embeddable>}
   */
  public abstract create(
    containerMetadata: { id: string },
    onEmbeddableStateChanged: (embeddableStateChanges: EmbeddableState) => void
  ): Promise<Embeddable>;
}
