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

import { PropTypes } from 'prop-types';

/**
 * @typedef {Object} EmbeddableMetadata - data that does not change over the course of the embeddables life span.
 * @property {string} title
 * @property {string|undefined} editUrl
 * @property {IndexPattern} indexPattern
 */

export const embeddableShape = PropTypes.shape({
  metadata: PropTypes.object.isRequired,
  onContainerStateChanged: PropTypes.func.isRequired,
  render: PropTypes.func.isRequired,
  destroy: PropTypes.func.isRequired,
});

export class Embeddable {
  /**
   *
   * @param {Object|undefined} config
   * @param {EmbeddableMetadata|undefined} config.metadata optional metadata
   * @param {function|undefined} config.render optional render method
   * @param {function|undefined} config.destroy optional destroy method
   * @param {function|undefined} config.onContainerStateChanged optional onContainerStateChanged method
   */
  constructor(config = {}) {
    /**
     * @type {EmbeddableMetadata}
     */
    this.metadata = config.metadata || {};

    if (config.render) {
      this.render = config.render;
    }

    if (config.destroy) {
      this.destroy = config.destroy;
    }

    if (config.onContainerStateChanged) {
      this.onContainerStateChanged = config.onContainerStateChanged;
    }
  }

  /**
   * @param {ContainerState} containerState
   */
  onContainerStateChanged(/*containerState*/) {}

  /**
   * @param {Element} domNode - the dom node to mount the rendered embeddable on
   * @param {ContainerState} containerState
   */
  render(/*domNode, containerState*/) {}

  destroy() {}
}
