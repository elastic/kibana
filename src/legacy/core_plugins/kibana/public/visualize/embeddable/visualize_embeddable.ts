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

import _, { forEach } from 'lodash';
import { PersistedState } from 'ui/persisted_state';
import { Subscription } from 'rxjs';
import * as Rx from 'rxjs';
import { buildPipeline } from 'ui/visualize/loader/pipeline_helpers';
import { SavedObject } from 'ui/saved_objects/types';
import { Vis } from 'ui/vis';
import { queryGeohashBounds } from 'ui/visualize/loader/utils';
import { getTableAggs } from 'ui/visualize/loader/pipeline_helpers/utilities';
import { AppState } from 'ui/state_management/app_state';
import { npStart } from 'ui/new_platform';
import { IExpressionLoaderParams } from 'src/plugins/expressions/public';
import { SearchSourceContract } from 'ui/courier';
import { VISUALIZE_EMBEDDABLE_TYPE } from './constants';
import {
  IIndexPattern,
  TimeRange,
  Query,
  onlyDisabledFiltersChanged,
  esFilters,
  mapAndFlattenFilters,
} from '../../../../../../plugins/data/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
  Embeddable,
  Container,
  APPLY_FILTER_TRIGGER,
} from '../../../../../../plugins/embeddable/public';
import { dispatchRenderComplete } from '../../../../../../plugins/kibana_utils/public';
import { SavedSearch } from '../../discover/types';

const getKeys = <T extends {}>(o: T): Array<keyof T> => Object.keys(o) as Array<keyof T>;

export interface VisSavedObject extends SavedObject {
  vis: Vis;
  description?: string;
  searchSource: SearchSourceContract;
  title: string;
  uiStateJSON?: string;
  destroy: () => void;
  savedSearchRefName?: string;
  savedSearchId?: string;
  savedSearch?: SavedSearch;
  visState: any;
}

export interface VisualizeEmbeddableConfiguration {
  savedVisualization: VisSavedObject;
  indexPatterns?: IIndexPattern[];
  editUrl: string;
  editable: boolean;
  appState?: AppState;
  uiState?: PersistedState;
}

export interface VisualizeInput extends EmbeddableInput {
  timeRange?: TimeRange;
  query?: Query;
  filters?: esFilters.Filter[];
  vis?: {
    colors?: { [key: string]: string };
  };
  appState?: AppState;
  uiState?: PersistedState;
}

export interface VisualizeOutput extends EmbeddableOutput {
  editUrl: string;
  indexPatterns?: IIndexPattern[];
  savedObjectId: string;
  visTypeName: string;
}

type ExpressionLoader = InstanceType<typeof npStart.plugins.expressions.ExpressionLoader>;

export class VisualizeEmbeddable extends Embeddable<VisualizeInput, VisualizeOutput> {
  private handler?: ExpressionLoader;
  private savedVisualization: VisSavedObject;
  private appState: AppState | undefined;
  private uiState: PersistedState;
  private timeRange?: TimeRange;
  private query?: Query;
  private title?: string;
  private filters?: esFilters.Filter[];
  private visCustomizations: VisualizeInput['vis'];
  private subscriptions: Subscription[] = [];
  private expression: string = '';
  private actions: any = {};
  private vis: Vis;
  private domNode: any;
  public readonly type = VISUALIZE_EMBEDDABLE_TYPE;

  constructor(
    {
      savedVisualization,
      editUrl,
      indexPatterns,
      editable,
      appState,
      uiState,
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
    this.appState = appState;
    this.savedVisualization = savedVisualization;
    this.vis = this.savedVisualization.vis;

    this.vis.on('update', this.handleVisUpdate);
    this.vis.on('reload', this.reload);

    if (uiState) {
      this.uiState = uiState;
    } else {
      const parsedUiState = savedVisualization.uiStateJSON
        ? JSON.parse(savedVisualization.uiStateJSON)
        : {};
      this.uiState = new PersistedState(parsedUiState);

      this.uiState.on('change', this.uiStateChangeHandler);
    }

    this.vis._setUiState(this.uiState);

    this.subscriptions.push(
      Rx.merge(this.getOutput$(), this.getInput$()).subscribe(() => {
        this.handleChanges();
      })
    );
  }

  public getVisualizationDescription() {
    return this.savedVisualization.description;
  }

  public getInspectorAdapters = () => {
    if (!this.handler) {
      return undefined;
    }
    return this.handler.inspect();
  };

  public openInspector = () => {
    if (this.handler) {
      return this.handler.openInspector(this.getTitle() || '');
    }
  };

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
    } else if (!this.appState) {
      this.uiState.clearAllKeys();
    }
  }

  public async handleChanges() {
    this.transferCustomizationsToUiState();

    let dirty = false;

    // Check if timerange has changed
    if (!_.isEqual(this.input.timeRange, this.timeRange)) {
      this.timeRange = _.cloneDeep(this.input.timeRange);
      dirty = true;
    }

    // Check if filters has changed
    if (!onlyDisabledFiltersChanged(this.input.filters, this.filters)) {
      this.filters = this.input.filters;
      dirty = true;
    }

    // Check if query has changed
    if (!_.isEqual(this.input.query, this.query)) {
      this.query = this.input.query;
      dirty = true;
    }

    if (this.output.title !== this.title) {
      this.title = this.output.title;
      if (this.domNode) {
        this.domNode.setAttribute('data-title', this.title || '');
      }
    }

    if (this.savedVisualization.description && this.domNode) {
      this.domNode.setAttribute('data-description', this.savedVisualization.description);
    }

    if (this.handler && dirty) {
      this.updateHandler();
    }
  }

  /**
   *
   * @param {Element} domNode
   */
  public async render(domNode: HTMLElement) {
    this.timeRange = _.cloneDeep(this.input.timeRange);

    this.transferCustomizationsToUiState();

    this.savedVisualization.vis._setUiState(this.uiState);
    this.uiState = this.savedVisualization.vis.getUiState();

    // init default actions
    forEach(this.vis.type.events, (event, eventName) => {
      if (event.disabled || !eventName) {
        return;
      } else {
        this.actions[eventName] = event.defaultAction;
      }
    });

    // This is a hack to give maps visualizations access to data in the
    // globalState, since they can no longer access it via searchSource.
    // TODO: Remove this as a part of elastic/kibana#30593
    this.vis.API.getGeohashBounds = () => {
      return queryGeohashBounds(this.savedVisualization.vis, {
        filters: this.filters,
        query: this.query,
        searchSource: this.savedVisualization.searchSource,
      });
    };

    // this is a hack to make editor still work, will be removed once we clean up editor
    this.vis.hasInspector = () => {
      const visTypesWithoutInspector = ['markdown', 'input_control_vis', 'metrics', 'vega'];
      if (visTypesWithoutInspector.includes(this.vis.type.name)) {
        return false;
      }
      return this.getInspectorAdapters();
    };

    this.vis.openInspector = this.openInspector;

    const div = document.createElement('div');
    div.className = `visualize panel-content panel-content--fullWidth`;
    domNode.appendChild(div);
    this.domNode = div;

    this.handler = new npStart.plugins.expressions.ExpressionLoader(this.domNode);

    this.subscriptions.push(
      this.handler.events$.subscribe(async event => {
        if (this.actions[event.name]) {
          event.data.aggConfigs = getTableAggs(this.vis);
          const filters: esFilters.Filter[] = this.actions[event.name](event.data) || [];
          const mappedFilters = mapAndFlattenFilters(filters);
          const timeFieldName = this.vis.indexPattern.timeFieldName;

          npStart.plugins.uiActions.executeTriggerActions(APPLY_FILTER_TRIGGER, {
            embeddable: this,
            filters: mappedFilters,
            timeFieldName,
          });
        }
      })
    );

    div.setAttribute('data-title', this.output.title || '');

    if (this.savedVisualization.description) {
      div.setAttribute('data-description', this.savedVisualization.description);
    }

    div.setAttribute('data-test-subj', 'visualizationLoader');
    div.setAttribute('data-shared-item', '');
    div.setAttribute('data-rendering-count', '0');
    div.setAttribute('data-render-complete', 'false');

    this.subscriptions.push(
      this.handler.loading$.subscribe(() => {
        div.setAttribute('data-render-complete', 'false');
        div.setAttribute('data-loading', '');
      })
    );

    this.subscriptions.push(
      this.handler.render$.subscribe(count => {
        div.removeAttribute('data-loading');
        div.setAttribute('data-render-complete', 'true');
        div.setAttribute('data-rendering-count', count.toString());
        dispatchRenderComplete(div);
      })
    );

    this.updateHandler();
  }

  public destroy() {
    super.destroy();
    this.subscriptions.forEach(s => s.unsubscribe());
    this.uiState.off('change', this.uiStateChangeHandler);
    this.savedVisualization.vis.removeListener('reload', this.reload);
    this.savedVisualization.vis.removeListener('update', this.handleVisUpdate);
    this.savedVisualization.destroy();
    if (this.handler) {
      this.handler.destroy();
      this.handler.getElement().remove();
    }
  }

  public reload = () => {
    this.handleVisUpdate();
  };

  private async updateHandler() {
    const expressionParams: IExpressionLoaderParams = {
      searchContext: {
        type: 'kibana_context',
        timeRange: this.timeRange,
        query: this.input.query,
        filters: this.input.filters,
      },
      extraHandlers: {
        vis: this.vis,
        uiState: this.uiState,
      },
    };
    this.expression = await buildPipeline(this.vis, {
      searchSource: this.savedVisualization.searchSource,
      timeRange: this.timeRange,
    });

    this.vis.filters = { timeRange: this.timeRange };

    if (this.handler) {
      this.handler.update(this.expression, expressionParams);
    }

    this.vis.emit('apply');
  }

  private handleVisUpdate = async () => {
    if (this.appState) {
      this.appState.vis = this.savedVisualization.vis.getState();
      this.appState.save();
    }

    this.updateHandler();
  };

  private uiStateChangeHandler = () => {
    this.updateInput({
      ...this.uiState.toJSON(),
    });
  };
}
