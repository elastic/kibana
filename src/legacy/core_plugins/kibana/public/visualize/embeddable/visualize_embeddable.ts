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
import {
  APPLY_FILTER_TRIGGER,
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  Filters,
  Query,
  TimeRange,
  Trigger,
  Container,
} from 'plugins/embeddable_api/index';
import { StaticIndexPattern } from 'ui/index_patterns';
import { PersistedState } from 'ui/persisted_state';
import { VisualizeLoader } from 'ui/visualize/loader';
import { EmbeddedVisualizeHandler } from 'ui/visualize/loader/embedded_visualize_handler';
import {
  Filter,
  VisSavedObject,
  VisualizeLoaderParams,
  VisualizeUpdateParams,
} from 'ui/visualize/loader/types';
import { Subscription } from 'rxjs';
import { VISUALIZE_EMBEDDABLE_TYPE } from './visualize_embeddable_factory';

export interface VisualizeEmbeddableConfiguration {
  savedVisualization: VisSavedObject;
  indexPatterns?: StaticIndexPattern[];
  editUrl: string;
  loader: VisualizeLoader;
  editable: boolean;
}

// interface VisualizeOverrides {
//   vis?: {
//     colors?: { [key: string]: string };
//   };
//   title?: string;
// }

export interface VisualizeInput extends EmbeddableInput {
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filters;
  hidePanelTitles?: boolean;
  vis?: {
    colors?: { [key: string]: string };
  };
}

export interface VisualizeOutput extends EmbeddableOutput {
  title: string;
  editUrl: string;
  indexPatterns?: StaticIndexPattern[];
}

export class VisualizeEmbeddable extends Embeddable<VisualizeInput, VisualizeOutput> {
  private savedVisualization: VisSavedObject;
  private loader: VisualizeLoader;
  private uiState: PersistedState;
  private handler?: EmbeddedVisualizeHandler;
  private timeRange?: TimeRange;
  private query?: Query;
  private filters?: Filters;
  private subscription: Subscription;

  constructor(
    {
      savedVisualization,
      loader,
      editUrl,
      indexPatterns,
      editable,
    }: VisualizeEmbeddableConfiguration,
    initialInput: VisualizeInput,
    parent?: Container
  ) {
    super(
      VISUALIZE_EMBEDDABLE_TYPE,
      initialInput,
      {
        title: savedVisualization.title,
        editUrl,
        indexPatterns,
        editable,
      },
      parent
    );
    this.savedVisualization = savedVisualization;
    this.loader = loader;

    const parsedUiState = savedVisualization.uiStateJSON
      ? JSON.parse(savedVisualization.uiStateJSON)
      : {};
    this.uiState = new PersistedState(parsedUiState);

    this.uiState.on('change', this.uiStateChangeHandler);

    this.subscription = this.getInput$().subscribe(changes => {
      this.reload();
      this.handleInputChanges(changes);
    });
  }

  public getInspectorAdapters() {
    if (!this.handler) {
      return undefined;
    }
    return this.handler.inspectorAdapters;
  }

  public supportsTrigger(trigger: Trigger) {
    return trigger.id !== APPLY_FILTER_TRIGGER;
  }

  /**
   * Transfers all changes in the containerState.customization into
   * the uiState of this visualization.
   */
  public transferCustomizationsToUiState(changes: Partial<VisualizeInput>) {
    // Check for changes that need to be forwarded to the uiState
    // Since the vis has an own listener on the uiState we don't need to
    // pass anything from here to the handler.update method
    const visCustomizations = changes.vis;
    if (visCustomizations && !_.isEqual(this.input.vis, visCustomizations)) {
      // Turn this off or the uiStateChangeHandler will fire for every modification.
      this.uiState.off('change', this.uiStateChangeHandler);
      this.uiState.clearAllKeys();
      this.uiState.set('vis', visCustomizations);
      // Object.getOwnPropertyNames(customization).forEach(key => {
      //   this.uiState.set(key, customization[key]);
      // });
      this.uiState.on('change', this.uiStateChangeHandler);
    }
  }

  public handleInputChanges(input: Partial<VisualizeInput>) {
    this.transferCustomizationsToUiState(input);

    const updatedParams: VisualizeUpdateParams = {};

    // Check if timerange has changed
    if (input.timeRange !== this.timeRange) {
      updatedParams.timeRange = input.timeRange;
      this.timeRange = input.timeRange;
    }

    // Check if filters has changed
    if (input.filters !== this.filters) {
      updatedParams.filters = input.filters;
      this.filters = input.filters;
    }

    // Check if query has changed
    if (input.query !== this.query) {
      updatedParams.query = input.query;
      this.query = input.query;
    }

    if (input.title || input.hidePanelTitles) {
      let derivedPanelTitle = '';
      if (!this.input.hidePanelTitles) {
        derivedPanelTitle =
          this.input.title === undefined ? this.savedVisualization.title : this.input.title;
      }
      updatedParams.dataAttrs = {
        title: derivedPanelTitle,
      };
      this.updateOutput({ title: derivedPanelTitle });
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
  public render(domNode: HTMLElement) {
    this.timeRange = this.input.timeRange;
    this.query = this.input.query;
    this.filters = this.input.filters;

    this.transferCustomizationsToUiState(this.input);

    const dataAttrs: { [key: string]: string } = {
      'shared-item': '',
      title: this.output.title,
    };
    if (this.savedVisualization.description) {
      dataAttrs.description = this.savedVisualization.description;
    }

    const handlerParams: VisualizeLoaderParams = {
      uiState: this.uiState,
      // Append visualization to container instead of replacing its content
      append: true,
      timeRange: this.input.timeRange,
      query: this.input.query,
      filters: this.input.filters,
      cssClass: `panel-content panel-content--fullWidth`,
      dataAttrs,
    };

    this.handler = this.loader.embedVisualizationWithSavedObject(
      domNode,
      this.savedVisualization,
      handlerParams
    );
  }

  public destroy() {
    super.destroy();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
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

  private uiStateChangeHandler = () => {
    this.updateInput({
      ...this.uiState.toJSON(),
    });
  };
}
