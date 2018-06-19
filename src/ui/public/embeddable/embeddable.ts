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

import * as PropTypes from 'prop-types';
import { ContainerState } from './types';

// TODO: we'll be able to get rid of this shape once all of dashboard is typescriptified too.
export const embeddableShape = PropTypes.shape({
  destroy: PropTypes.func.isRequired,
  metadata: PropTypes.object.isRequired,
  onContainerStateChanged: PropTypes.func.isRequired,
  render: PropTypes.func.isRequired,
});

export interface EmbeddableMetadata {
  // TODO: change to an array, embeddables should be able to specify multiple index patterns they use. Also
  // see https://github.com/elastic/kibana/issues/19408 - this needs to be generalized to support embeddables that
  // use dynamic index patterns (vega, TSVB) instead of saved object index patterns (most other visualizations).
  /**
   * Should specify any index pattern the embeddable uses. This will be used by the container to list out
   * available fields to filter on.
   */
  indexPattern?: object;

  /**
   * The title, or name, of the embeddable.
   */
  title?: string;

  /**
   * A url to direct the user for managing the embeddable instance. We may want to eventually make this optional
   * for non-instanced panels that can only be created and deleted but not edited. We also wish to eventually support
   * in-place editing on the dashboard itself, so another option could be to supply an element, or fly out panel, to
   * offer for editing directly on the dashboard.
   */
  editUrl?: string;
}

interface EmbeddableOptions {
  metadata?: EmbeddableMetadata;
  render?: (domNode: HTMLElement, containerState: ContainerState) => void;
  destroy?: () => void;
  onContainerStateChanged?: (containerState: ContainerState) => void;
}

export abstract class Embeddable {
  public readonly metadata: EmbeddableMetadata = {};

  // TODO: Make title and editUrl required and move out of options parameter.
  constructor(options: EmbeddableOptions = {}) {
    this.metadata = options.metadata || {};

    if (options.render) {
      this.render = options.render;
    }

    if (options.destroy) {
      this.destroy = options.destroy;
    }

    if (options.onContainerStateChanged) {
      this.onContainerStateChanged = options.onContainerStateChanged;
    }
  }

  public abstract onContainerStateChanged(containerState: ContainerState): void;

  /**
   * Embeddable should render itself at the given domNode.
   */
  public abstract render(
    domNode: HTMLElement,
    containerState: ContainerState
  ): void;

  public destroy(): void {
    return;
  }
}
