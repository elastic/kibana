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

import _ from 'lodash';
import { ContainerState, Embeddable } from 'ui/embeddable';
import { OnEmbeddableStateChanged } from 'ui/embeddable/embeddable_factory';
import { Filters, Query, TimeRange } from 'ui/embeddable/types';
import { StaticIndexPattern } from 'ui/index_patterns';
import { PersistedState } from 'ui/persisted_state';
import { VisualizeLoader } from 'ui/visualize/loader';
import { EmbeddedVisualizeHandler } from 'ui/visualize/loader/embedded_visualize_handler';
import {
  VisSavedObject,
  VisualizeLoaderParams,
  VisualizeUpdateParams,
} from 'ui/visualize/loader/types';
import { i18n } from '@kbn/i18n';

export interface VisualizeEmbeddableConfiguration {
  onEmbeddableStateChanged: OnEmbeddableStateChanged;
  savedVisualization: VisSavedObject;
  indexPatterns?: StaticIndexPattern[];
  editUrl?: string;
  editable: boolean;
  loader: VisualizeLoader;
}

export class VisualizeEmbeddable extends Embeddable {
  private onEmbeddableStateChanged: OnEmbeddableStateChanged;
  private savedVisualization: VisSavedObject;
  private loader: VisualizeLoader;
  private uiState: PersistedState;
  private handler?: EmbeddedVisualizeHandler;
  private customization?: object;
  private panelTitle?: string;
  private timeRange?: TimeRange;
  private query?: Query;
  private filters?: Filters;

  constructor({
    onEmbeddableStateChanged,
    savedVisualization,
    indexPatterns,
    editUrl,
    editable,
    loader,
  }: VisualizeEmbeddableConfiguration) {
    super({
      title: savedVisualization.title,
      editUrl,
      editLabel: i18n.translate('kbn.embeddable.visualize.editLabel', {
        defaultMessage: 'Edit visualization',
      }),
      editable,
      indexPatterns,
    });
    this.onEmbeddableStateChanged = onEmbeddableStateChanged;
    this.savedVisualization = savedVisualization;
    this.loader = loader;

    const parsedUiState = savedVisualization.uiStateJSON
      ? JSON.parse(savedVisualization.uiStateJSON)
      : {};
    this.uiState = new PersistedState(parsedUiState);

    this.uiState.on('change', this.uiStateChangeHandler);
  }

  public getInspectorAdapters() {
    if (!this.handler) {
      return undefined;
    }
    return this.handler.inspectorAdapters;
  }

  public getEmbeddableState() {
    return {
      customization: this.customization,
    };
  }

  /**
   * Transfers all changes in the containerState.embeddableCustomization into
   * the uiState of this visualization.
   */
  public transferCustomizationsToUiState(containerState: ContainerState) {
    // Check for changes that need to be forwarded to the uiState
    // Since the vis has an own listener on the uiState we don't need to
    // pass anything from here to the handler.update method
    const customization = containerState.embeddableCustomization;
    if (customization && !_.isEqual(this.customization, customization)) {
      // Turn this off or the uiStateChangeHandler will fire for every modification.
      this.uiState.off('change', this.uiStateChangeHandler);
      this.uiState.clearAllKeys();
      Object.getOwnPropertyNames(customization).forEach(key => {
        this.uiState.set(key, customization[key]);
      });
      this.customization = customization;
      this.uiState.on('change', this.uiStateChangeHandler);
    }
  }

  public onContainerStateChanged(containerState: ContainerState) {
    this.transferCustomizationsToUiState(containerState);

    const updatedParams: VisualizeUpdateParams = {};

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
  public render(domNode: HTMLElement, containerState: ContainerState) {
    this.panelTitle = this.getPanelTitle(containerState);
    this.timeRange = containerState.timeRange;
    this.query = containerState.query;
    this.filters = containerState.filters;

    this.transferCustomizationsToUiState(containerState);

    const dataAttrs: { [key: string]: string } = {
      'shared-item': '',
      title: this.panelTitle,
    };
    if (this.savedVisualization.description) {
      dataAttrs.description = this.savedVisualization.description;
    }

    const handlerParams: VisualizeLoaderParams = {
      uiState: this.uiState,
      // Append visualization to container instead of replacing its content
      append: true,
      timeRange: containerState.timeRange,
      query: containerState.query,
      filters: containerState.filters,
      cssClass: `embPanel__content embPanel__content--fullWidth`,
      dataAttrs,
    };

    this.handler = this.loader.embedVisualizationWithSavedObject(
      domNode,
      this.savedVisualization,
      handlerParams
    );
  }

  public destroy() {
    this.uiState.off('change', this.uiStateChangeHandler);
    this.savedVisualization.destroy();
    if (this.handler) {
      this.handler.destroy();
      this.handler.getElement().remove();
    }
  }

  public reload() {
    if (this.handler) {
      this.handler.reload();
    }
  }

  /**
   * Retrieve the panel title for this panel from the container state.
   * This will either return the overwritten panel title or the visualization title.
   */
  private getPanelTitle(containerState: ContainerState) {
    let derivedPanelTitle = '';
    if (!containerState.hidePanelTitles) {
      derivedPanelTitle =
        containerState.customTitle !== undefined
          ? containerState.customTitle
          : this.savedVisualization.title;
    }
    return derivedPanelTitle;
  }

  private uiStateChangeHandler = () => {
    this.customization = this.uiState.toJSON();
    this.onEmbeddableStateChanged(this.getEmbeddableState());
  };
}
