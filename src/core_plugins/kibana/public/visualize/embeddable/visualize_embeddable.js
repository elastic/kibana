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

import { PersistedState } from 'ui/persisted_state';
import { Embeddable } from 'ui/embeddable';
import chrome from 'ui/chrome';
import _ from 'lodash';

export class VisualizeEmbeddable extends Embeddable  {
  constructor({ onEmbeddableStateChanged, savedVisualization, editUrl, loader }) {
    super({
      metadata: {
        title: savedVisualization.title,
        editUrl,
        indexPattern: savedVisualization.vis.indexPattern
      }
    });
    this._onEmbeddableStateChanged = onEmbeddableStateChanged;
    this.savedVisualization = savedVisualization;
    this.loader = loader;

    const parsedUiState = savedVisualization.uiStateJSON ? JSON.parse(savedVisualization.uiStateJSON) : {};
    this.uiState = new PersistedState(parsedUiState);

    this.uiState.on('change', this._uiStateChangeHandler);
  }

  _uiStateChangeHandler = () => {
    this.customization = this.uiState.toJSON();
    this._onEmbeddableStateChanged(this.getEmbeddableState());
  };

  getEmbeddableState() {
    return {
      customization: this.customization,
    };
  }

  /**
   * Transfers all changes in the containerState.embeddableCustomization into
   * the uiState of this visualization.
   */
  transferCustomizationsToUiState(containerState) {
    // Check for changes that need to be forwarded to the uiState
    // Since the vis has an own listener on the uiState we don't need to
    // pass anything from here to the handler.update method
    const customization = containerState.embeddableCustomization;
    if (!_.isEqual(this.customization, customization)) {
      // Turn this off or the uiStateChangeHandler will fire for every modification.
      this.uiState.off('change', this._uiStateChangeHandler);
      this.uiState.clearAllKeys();
      Object.getOwnPropertyNames(customization).forEach(key => {
        this.uiState.set(key, customization[key]);
      });
      this.customization = customization;
      this.uiState.on('change', this._uiStateChangeHandler);
    }
  }

  /**
   * Retrieve the panel title for this panel from the container state.
   * This will either return the overwritten panel title or the visualization title.
   */
  getPanelTitle(containerState) {
    let derivedPanelTitle = '';
    if (!containerState.hidePanelTitles) {
      derivedPanelTitle = containerState.customTitle !== undefined ?
        containerState.customTitle :
        this.savedVisualization.title;
    }
    return derivedPanelTitle;
  }

  onContainerStateChanged(containerState) {
    this.transferCustomizationsToUiState(containerState);

    const updatedParams = {};

    // Check if timerange has changed
    if (containerState.timeRange !== this.timeRange) {
      updatedParams.timeRange = containerState.timeRange;
      this.timeRange = containerState.timeRange;
    }

    // Check if filters has changed
    if (containerState.filters !== this.filters) {
      updatedParams.filters = containerState.filters;
      this.filters = containerState.filters;
    }

    // Check if query has changed
    if (containerState.query !== this.query) {
      updatedParams.query = containerState.query;
      this.query = containerState.query;
    }

    const derivedPanelTitle = this.getPanelTitle(containerState);
    if (this.panelTitle !== derivedPanelTitle) {
      updatedParams.dataAttrs = {
        title: derivedPanelTitle,
      };
      this.panelTitle = derivedPanelTitle;
    }

    if (this.handler && !_.isEmpty(updatedParams)) {
      this.handler.update(updatedParams);
    }
  }

  /**
   *
   * @param {Element} domNode
   * @param {ContainerState} containerState
   */
  render(domNode, containerState) {
    this.panelTitle = this.getPanelTitle(containerState);
    this.timeRange = containerState.timeRange;
    this.query = containerState.query;
    this.filters = containerState.filters;

    this.transferCustomizationsToUiState(containerState);

    const handlerParams = {
      uiState: this.uiState,
      // Append visualization to container instead of replacing its content
      append: true,
      timeRange: containerState.timeRange,
      query: containerState.query,
      filters: containerState.filters,
      cssClass: `panel-content panel-content--fullWidth`,
      // The chrome is permanently hidden in "embed mode" in which case we don't want to show the spy pane, since
      // we deem that situation to be more public facing and want to hide more detailed information.
      showSpyPanel: !chrome.getIsChromePermanentlyHidden(),
      dataAttrs: {
        'shared-item': '',
        title: this.panelTitle,
        description: this.savedVisualization.description,
      }
    };

    this.handler = this.loader.embedVisualizationWithSavedObject(
      domNode,
      this.savedVisualization,
      handlerParams,
    );
  }

  destroy() {
    this.uiState.off('change', this._uiStateChangeHandler);
    this.savedVisualization.destroy();
    if (this.handler) {
      this.handler.destroy();
      this.handler.getElement().remove();
    }
  }
}
