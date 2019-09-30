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
import { StaticIndexPattern } from 'ui/index_patterns';
import { PersistedState } from 'ui/persisted_state';
import { VisualizeLoader } from 'ui/visualize/loader';
import { EmbeddedVisualizeHandler } from 'ui/visualize/loader/embedded_visualize_handler';
import {
  VisSavedObject,
  VisualizeLoaderParams,
  VisualizeUpdateParams,
} from 'ui/visualize/loader/types';
import { Subscription } from 'rxjs';
import * as Rx from 'rxjs';
import { Filter } from '@kbn/es-query';
import { TimeRange } from '../../../../../../plugins/data/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
  Embeddable,
  Container,
} from '../../../../../../plugins/embeddable/public';
import { Query, onlyDisabledFiltersChanged } from '../../../../data/public';
import { VISUALIZE_EMBEDDABLE_TYPE } from './constants';

const getKeys = <T extends {}>(o: T): Array<keyof T> => Object.keys(o) as Array<keyof T>;

export interface VisualizeEmbeddableConfiguration {
  savedVisualization: VisSavedObject;
  indexPatterns?: StaticIndexPattern[];
  editUrl: string;
  loader: VisualizeLoader;
  editable: boolean;
}

export interface VisualizeInput extends EmbeddableInput {
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filter[];
  vis?: {
    colors?: { [key: string]: string };
  };
}

export interface VisualizeOutput extends EmbeddableOutput {
  editUrl: string;
  indexPatterns?: StaticIndexPattern[];
  savedObjectId: string;
  visTypeName: string;
}

export class VisualizeEmbeddable extends Embeddable<VisualizeInput, VisualizeOutput> {
  private savedVisualization: VisSavedObject;
  private loader: VisualizeLoader;
  private uiState: PersistedState;
  private handler?: EmbeddedVisualizeHandler;
  private timeRange?: TimeRange;
  private query?: Query;
  private title?: string;
  private filters?: Filter[];
  private visCustomizations: VisualizeInput['vis'];
  private subscription: Subscription;
  public readonly type = VISUALIZE_EMBEDDABLE_TYPE;

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
      initialInput,
      {
        defaultTitle: savedVisualization.title,
        editUrl,
        indexPatterns,
        editable,
        savedObjectId: savedVisualization.id!,
        visTypeName: savedVisualization.vis.type.name,
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

    this.subscription = Rx.merge(this.getOutput$(), this.getInput$()).subscribe(() => {
      this.handleChanges();
    });
  }

  public getVisualizationDescription() {
    return this.savedVisualization.description;
  }

  public getInspectorAdapters() {
    if (!this.handler) {
      return undefined;
    }
    return this.handler.inspectorAdapters;
  }

  /**
   * Transfers all changes in the containerState.customization into
   * the uiState of this visualization.
   */
  public transferCustomizationsToUiState() {
    // Check for changes that need to be forwarded to the uiState
    // Since the vis has an own listener on the uiState we don't need to
    // pass anything from here to the handler.update method
    const visCustomizations = this.input.vis;
    if (visCustomizations) {
      if (!_.isEqual(visCustomizations, this.visCustomizations)) {
        this.visCustomizations = visCustomizations;
        // Turn this off or the uiStateChangeHandler will fire for every modification.
        this.uiState.off('change', this.uiStateChangeHandler);
        this.uiState.clearAllKeys();
        this.uiState.set('vis', visCustomizations);
        getKeys(visCustomizations).forEach(key => {
          this.uiState.set(key, visCustomizations[key]);
        });
        this.uiState.on('change', this.uiStateChangeHandler);
      }
    } else {
      this.uiState.clearAllKeys();
    }
  }

  public handleChanges() {
    this.transferCustomizationsToUiState();

    const updatedParams: VisualizeUpdateParams = {};

    // Check if timerange has changed
    if (!_.isEqual(this.input.timeRange, this.timeRange)) {
      this.timeRange = _.cloneDeep(this.input.timeRange);
      updatedParams.timeRange = this.timeRange;
    }

    // Check if filters has changed
    if (!onlyDisabledFiltersChanged(this.input.filters, this.filters)) {
      updatedParams.filters = this.input.filters;
      this.filters = this.input.filters;
    }

    // Check if query has changed
    if (!_.isEqual(this.input.query, this.query)) {
      updatedParams.query = this.input.query;
      this.query = this.input.query;
    }

    if (this.output.title !== this.title) {
      this.title = this.output.title;
      updatedParams.dataAttrs = {
        title: this.title || '',
      };
    }

    if (this.handler && !_.isEmpty(updatedParams)) {
      this.handler.update(updatedParams);
      this.handler.reload();
    }
  }

  /**
   *
   * @param {Element} domNode
   * @param {ContainerState} containerState
   */
  public render(domNode: HTMLElement) {
    this.timeRange = _.cloneDeep(this.input.timeRange);
    this.query = this.input.query;
    this.filters = this.input.filters;

    this.transferCustomizationsToUiState();

    const dataAttrs: { [key: string]: string } = {
      'shared-item': '',
      title: this.output.title || '',
    };
    if (this.savedVisualization.description) {
      dataAttrs.description = this.savedVisualization.description;
    }

    const handlerParams: VisualizeLoaderParams = {
      uiState: this.uiState,
      // Append visualization to container instead of replacing its content
      append: true,
      timeRange: _.cloneDeep(this.input.timeRange),
      query: this.query,
      filters: this.filters,
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
