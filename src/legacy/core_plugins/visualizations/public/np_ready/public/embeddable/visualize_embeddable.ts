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

import _, { get } from 'lodash';
import { Subscription } from 'rxjs';
import * as Rx from 'rxjs';
import { SavedObjectLoader } from 'src/plugins/saved_objects/public';
import { VISUALIZE_EMBEDDABLE_TYPE } from './constants';
import {
  IIndexPattern,
  TimeRange,
  Query,
  esFilters,
  Filter,
  TimefilterContract,
} from '../../../../../../../plugins/data/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
  Embeddable,
  EmbeddableVisTriggerContext,
  IContainer,
} from '../../../../../../../plugins/embeddable/public';
import { dispatchRenderComplete } from '../../../../../../../plugins/kibana_utils/public';
import {
  IExpressionLoaderParams,
  ExpressionsStart,
} from '../../../../../../../plugins/expressions/public';
import { buildPipeline } from '../legacy/build_pipeline';
import { Vis } from '../vis';
import { getExpressions, getUiActions, getHttp } from '../services';
import { VIS_EVENT_TO_TRIGGER } from './events';
import { SerializedVis } from '../types';

const getKeys = <T extends {}>(o: T): Array<keyof T> => Object.keys(o) as Array<keyof T>;

export interface VisualizeEmbeddableConfiguration {
  editable: boolean;
  savedVisualizations: SavedObjectLoader;
}

export interface VisualizeInput extends EmbeddableInput {
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filter[];
  // This should probably be called "vis overrides". "vis" is a bad name.
  vis?: {
    colors?: { [key: string]: string };
  };
  visObject: SerializedVis;
}

export interface VisualizeOutput extends EmbeddableOutput {
  editUrl: string;
  indexPatterns?: IIndexPattern[];
  visTypeName: string;
}

type ExpressionLoader = InstanceType<ExpressionsStart['ExpressionLoader']>;

function getOutput(
  input: VisualizeInput,
  { savedVisualizations, editable }: VisualizeEmbeddableConfiguration
): VisualizeOutput {
  const vis = new Vis(input.visObject.type, input.visObject);
  const indexPattern = vis.data.indexPattern;
  const indexPatterns = indexPattern ? [indexPattern] : [];
  const editUrl = input.visObject.id
    ? getHttp().basePath.prepend(`/app/kibana${savedVisualizations.urlFor(input.visObject.id)}`)
    : '';
  return {
    defaultTitle: vis.title,
    editUrl,
    editable,
    indexPatterns,
    visTypeName: vis.type.name,
  };
}

export class VisualizeEmbeddable extends Embeddable<VisualizeInput, VisualizeOutput> {
  private handler?: ExpressionLoader;
  private timefilter: TimefilterContract;
  private timeRange?: TimeRange;
  private query?: Query;
  private title?: string;
  private filters?: Filter[];
  private visObject?: SerializedVis;
  private visCustomizations: VisualizeInput['vis'];
  private subscriptions: Subscription[] = [];
  private expression: string = '';
  private vis: Vis;
  private domNode: any;
  public readonly type = VISUALIZE_EMBEDDABLE_TYPE;
  private autoRefreshFetchSubscription: Subscription;
  private abortController?: AbortController;

  constructor(
    timefilter: TimefilterContract,
    config: VisualizeEmbeddableConfiguration,
    input: VisualizeInput,
    parent?: IContainer
  ) {
    super(input, getOutput(input, config), parent);
    this.timefilter = timefilter;

    this.autoRefreshFetchSubscription = timefilter
      .getAutoRefreshFetch$()
      .subscribe(this.updateHandler.bind(this));

    this.vis = new Vis(input.visObject.type, input.visObject);
    this.vis.uiState.on('change', this.uiStateChangeHandler);
    this.subscriptions.push(
      Rx.merge(this.getInput$()).subscribe(() => {
        const output = getOutput(this.input, { savedVisualizations, editable });
        this.updateOutput(output);
        this.handleChanges();
      })
    );
  }

  public getVisualizationDescription() {
    return this.vis.description;
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
        this.vis.uiState.off('change', this.uiStateChangeHandler);
        this.vis.uiState.clearAllKeys();
        this.vis.uiState.set('vis', visCustomizations);
        getKeys(visCustomizations).forEach(key => {
          this.vis.uiState.set(key, visCustomizations[key]);
        });
        this.vis.uiState.on('change', this.uiStateChangeHandler);
      }
    } else if (this.parent) {
      this.vis.uiState.clearAllKeys();
    }
  }

  public async handleChanges() {
    this.transferCustomizationsToUiState();

    let dirty = false;

    if (!_.isEqual(this.input.visObject, this.visObject)) {
      this.visObject = this.input.visObject;
      this.vis.uiState.off('change', this.uiStateChangeHandler);
      this.vis = new Vis(this.input.visObject.type, this.input.visObject);
      this.vis.uiState.on('change', this.uiStateChangeHandler);

      dirty = true;
    }

    // Check if timerange has changed
    if (!_.isEqual(this.input.timeRange, this.timeRange)) {
      this.timeRange = _.cloneDeep(this.input.timeRange);
      dirty = true;
    }

    // Check if filters has changed
    if (!esFilters.onlyDisabledFiltersChanged(this.input.filters, this.filters)) {
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

    if (this.vis.description && this.domNode) {
      this.domNode.setAttribute('data-description', this.vis.description);
    }

    if (this.handler && dirty) {
      this.updateHandler();
    }
  }

  // this is a hack to make editor still work, will be removed once we clean up editor
  // @ts-ignore
  hasInspector = () => {
    const visTypesWithoutInspector = [
      'markdown',
      'input_control_vis',
      'metrics',
      'vega',
      'timelion',
    ];
    if (visTypesWithoutInspector.includes(this.vis.type.name)) {
      return false;
    }
    return this.getInspectorAdapters();
  };

  /**
   *
   * @param {Element} domNode
   */
  public async render(domNode: HTMLElement) {
    this.timeRange = _.cloneDeep(this.input.timeRange);

    this.transferCustomizationsToUiState();

    const div = document.createElement('div');
    div.className = `visualize panel-content panel-content--fullWidth`;
    domNode.appendChild(div);
    this.domNode = div;

    const expressions = getExpressions();
    this.handler = new expressions.ExpressionLoader(this.domNode);

    this.subscriptions.push(
      this.handler.events$.subscribe(async event => {
        // maps hack, remove once esaggs function is cleaned up and ready to accept variables
        if (event.name === 'bounds') {
          const agg = this.vis.data.aggs!.aggs.find((a: any) => {
            return get(a, 'type.dslName') === 'geohash_grid';
          });
          if (
            (agg && agg.params.precision !== event.data.precision) ||
            (agg && !_.isEqual(agg.params.boundingBox, event.data.boundingBox))
          ) {
            agg.params.boundingBox = event.data.boundingBox;
            agg.params.precision = event.data.precision;
            this.reload();
          }
          return;
        }

        if (!this.input.disableTriggers) {
          const triggerId =
            event.name === 'brush' ? VIS_EVENT_TO_TRIGGER.brush : VIS_EVENT_TO_TRIGGER.filter;
          const context: EmbeddableVisTriggerContext = {
            embeddable: this,
            timeFieldName: this.vis.data.indexPattern!.timeFieldName!,
            data: event.data,
          };
          getUiActions()
            .getTrigger(triggerId)
            .exec(context);
        }
      })
    );

    div.setAttribute('data-title', this.output.title || '');

    if (this.vis.description) {
      div.setAttribute('data-description', this.vis.description);
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
    this.vis.uiState.off('change', this.uiStateChangeHandler);

    if (this.handler) {
      this.handler.destroy();
      this.handler.getElement().remove();
    }
    this.autoRefreshFetchSubscription.unsubscribe();
  }

  public reload = () => {
    this.handleVisUpdate();
  };

  private async updateHandler() {
    const expressionParams: IExpressionLoaderParams = {
      searchContext: {
        timeRange: this.timeRange,
        query: this.input.query,
        filters: this.input.filters,
      },
      uiState: this.vis.uiState,
    };
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    this.expression = await buildPipeline(this.vis, {
      timefilter: this.timefilter,
      timeRange: this.timeRange,
      abortSignal: this.abortController!.signal,
    });

    if (this.handler) {
      this.handler.update(this.expression, expressionParams);
    }
  }

  private handleVisUpdate = async () => {
    this.updateHandler();
  };

  private uiStateChangeHandler = () => {
    this.updateInput({
      ...this.vis.uiState.toJSON(),
    });
  };

  public supportedTriggers() {
    // TODO: Report a correct list of triggers for each vis_type.
    switch (this.vis.type.name) {
      case 'area':
      case 'heatmap':
      case 'histogram':
      case 'horizontal_bar':
      case 'line':
      case 'pie':
      case 'table':
      case 'tagcloud':
        return [VIS_EVENT_TO_TRIGGER.filter];
      case 'gauge':
      case 'goal':
      case 'input_control_vis':
      case 'markdown':
      case 'metric':
      case 'metrics':
      case 'region_map':
      case 'tile_map':
      case 'timelion':
      case 'vega':
      default:
        return [];
    }
  }
}
