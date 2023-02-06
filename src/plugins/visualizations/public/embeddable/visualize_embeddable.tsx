/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _, { get } from 'lodash';
import { Subscription, ReplaySubject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { render } from 'react-dom';
import { EuiLoadingChart } from '@elastic/eui';
import { Filter, onlyDisabledFiltersChanged, Query, TimeRange } from '@kbn/es-query';
import type { KibanaExecutionContext, SavedObjectAttributes } from '@kbn/core/public';
import type { ErrorLike } from '@kbn/expressions-plugin/common';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { TimefilterContract } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { Warnings } from '@kbn/charts-plugin/public';
import {
  Adapters,
  AttributeService,
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  FilterableEmbeddable,
  IContainer,
  ReferenceOrValueEmbeddable,
  SavedObjectEmbeddableInput,
} from '@kbn/embeddable-plugin/public';
import {
  ExpressionAstExpression,
  ExpressionLoader,
  ExpressionRenderError,
  IExpressionLoaderParams,
} from '@kbn/expressions-plugin/public';
import type { RenderMode } from '@kbn/expressions-plugin/common';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/public';
import { mapAndFlattenFilters } from '@kbn/data-plugin/public';
import { isFallbackDataView } from '../visualize_app/utils';
import { VisualizationMissedSavedObjectError } from '../components/visualization_missed_saved_object_error';
import VisualizationError from '../components/visualization_error';
import { VISUALIZE_EMBEDDABLE_TYPE } from './constants';
import { SerializedVis, Vis } from '../vis';
import {
  getApplication,
  getExecutionContext,
  getExpressions,
  getTheme,
  getUiActions,
} from '../services';
import { VIS_EVENT_TO_TRIGGER } from './events';
import { VisualizeEmbeddableFactoryDeps } from './visualize_embeddable_factory';
import { getSavedVisualization } from '../utils/saved_visualize_utils';
import { VisSavedObject } from '../types';
import { toExpressionAst } from './to_ast';

export interface VisualizeEmbeddableConfiguration {
  vis: Vis;
  indexPatterns?: DataView[];
  editPath: string;
  editUrl: string;
  capabilities: { visualizeSave: boolean; dashboardSave: boolean };
  deps: VisualizeEmbeddableFactoryDeps;
}

export interface VisualizeInput extends EmbeddableInput {
  vis?: {
    colors?: { [key: string]: string };
  };
  savedVis?: SerializedVis;
  renderMode?: RenderMode;
  table?: unknown;
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
  timeslice?: [number, number];
}

export interface VisualizeOutput extends EmbeddableOutput {
  editPath: string;
  editApp: string;
  editUrl: string;
  indexPatterns?: DataView[];
  visTypeName: string;
}

export type VisualizeSavedObjectAttributes = SavedObjectAttributes & {
  title: string;
  vis?: Vis;
  savedVis?: VisSavedObject;
};
export type VisualizeByValueInput = { attributes: VisualizeSavedObjectAttributes } & VisualizeInput;
export type VisualizeByReferenceInput = SavedObjectEmbeddableInput & VisualizeInput;

export class VisualizeEmbeddable
  extends Embeddable<VisualizeInput, VisualizeOutput>
  implements
    ReferenceOrValueEmbeddable<VisualizeByValueInput, VisualizeByReferenceInput>,
    FilterableEmbeddable
{
  private handler?: ExpressionLoader;
  private timefilter: TimefilterContract;
  private timeRange?: TimeRange;
  private query?: Query;
  private filters?: Filter[];
  private searchSessionId?: string;
  private syncColors?: boolean;
  private syncTooltips?: boolean;
  private syncCursor?: boolean;
  private embeddableTitle?: string;
  private visCustomizations?: Pick<VisualizeInput, 'vis' | 'table'>;
  private subscriptions: Subscription[] = [];
  private expression?: ExpressionAstExpression;
  private vis: Vis;
  private domNode: any;
  private warningDomNode: any;
  public readonly type = VISUALIZE_EMBEDDABLE_TYPE;
  private abortController?: AbortController;
  private readonly deps: VisualizeEmbeddableFactoryDeps;
  private readonly inspectorAdapters?: Adapters;
  private attributeService?: AttributeService<
    VisualizeSavedObjectAttributes,
    VisualizeByValueInput,
    VisualizeByReferenceInput
  >;
  private expressionVariables: Record<string, unknown> | undefined;
  private readonly expressionVariablesSubject = new ReplaySubject<
    Record<string, unknown> | undefined
  >(1);

  constructor(
    timefilter: TimefilterContract,
    { vis, editPath, editUrl, indexPatterns, deps, capabilities }: VisualizeEmbeddableConfiguration,
    initialInput: VisualizeInput,
    attributeService?: AttributeService<
      VisualizeSavedObjectAttributes,
      VisualizeByValueInput,
      VisualizeByReferenceInput
    >,
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        defaultTitle: vis.title,
        defaultDescription: vis.description,
        editPath,
        editApp: 'visualize',
        editUrl,
        indexPatterns,
        visTypeName: vis.type.name,
      },
      parent
    );
    this.deps = deps;
    this.timefilter = timefilter;
    this.syncColors = this.input.syncColors;
    this.syncTooltips = this.input.syncTooltips;
    this.syncCursor = this.input.syncCursor;
    this.searchSessionId = this.input.searchSessionId;
    this.query = this.input.query;
    this.embeddableTitle = this.getTitle();

    this.vis = vis;
    this.vis.uiState.on('change', this.uiStateChangeHandler);
    this.vis.uiState.on('reload', this.reload);
    this.attributeService = attributeService;

    if (this.attributeService) {
      const isByValue = !this.inputIsRefType(initialInput);
      const editable = capabilities.visualizeSave || (isByValue && capabilities.dashboardSave);
      this.updateOutput({ ...this.getOutput(), editable });
    }

    this.subscriptions.push(
      this.getInput$().subscribe(() => {
        const isDirty = this.handleChanges();

        if (isDirty && this.handler) {
          this.updateHandler();
        }
      })
    );

    const inspectorAdapters = this.vis.type.inspectorAdapters;

    if (inspectorAdapters) {
      this.inspectorAdapters =
        typeof inspectorAdapters === 'function' ? inspectorAdapters() : inspectorAdapters;
    }
  }

  public reportsEmbeddableLoad() {
    return true;
  }

  public getVis() {
    return this.vis;
  }

  /**
   * Gets the Visualize embeddable's local filters
   * @returns Local/panel-level array of filters for Visualize embeddable
   */
  public async getFilters() {
    let input = this.getInput();
    if (this.inputIsRefType(input)) {
      input = await this.getInputAsValueType();
    }
    const filters = input.savedVis?.data.searchSource?.filter ?? [];
    // must clone the filters so that it's not read only, because mapAndFlattenFilters modifies the array
    return mapAndFlattenFilters(_.cloneDeep(filters));
  }

  /**
   * Gets the Visualize embeddable's local query
   * @returns Local/panel-level query for Visualize embeddable
   */
  public async getQuery() {
    let input = this.getInput();
    if (this.inputIsRefType(input)) {
      input = await this.getInputAsValueType();
    }
    return input.savedVis?.data.searchSource?.query;
  }

  public getInspectorAdapters = () => {
    if (!this.handler || (this.inspectorAdapters && !Object.keys(this.inspectorAdapters).length)) {
      return undefined;
    }
    return this.handler.inspect();
  };

  public openInspector = () => {
    if (!this.handler) return;

    const adapters = this.handler.inspect();
    if (!adapters) return;

    return this.deps.start().plugins.inspector.open(adapters, {
      title:
        this.getTitle() ||
        i18n.translate('visualizations.embeddable.inspectorTitle', {
          defaultMessage: 'Inspector',
        }),
    });
  };

  /**
   * Transfers all changes in the containerState.customization into
   * the uiState of this visualization.
   */
  public transferCustomizationsToUiState() {
    // Check for changes that need to be forwarded to the uiState
    // Since the vis has an own listener on the uiState we don't need to
    // pass anything from here to the handler.update method
    const visCustomizations = { vis: this.input.vis, table: this.input.table };
    if (visCustomizations.vis || visCustomizations.table) {
      if (!_.isEqual(visCustomizations, this.visCustomizations)) {
        this.visCustomizations = visCustomizations;
        // Turn this off or the uiStateChangeHandler will fire for every modification.
        this.vis.uiState.off('change', this.uiStateChangeHandler);
        this.vis.uiState.clearAllKeys();

        Object.entries(visCustomizations).forEach(([key, value]) => {
          if (value) {
            this.vis.uiState.set(key, value);
          }
        });

        this.vis.uiState.on('change', this.uiStateChangeHandler);
      }
    } else if (this.parent) {
      this.vis.uiState.clearAllKeys();
    }
  }

  private handleChanges(): boolean {
    this.transferCustomizationsToUiState();

    let dirty = false;

    // Check if timerange has changed
    const nextTimeRange =
      this.input.timeslice !== undefined
        ? {
            from: new Date(this.input.timeslice[0]).toISOString(),
            to: new Date(this.input.timeslice[1]).toISOString(),
            mode: 'absolute' as 'absolute',
          }
        : this.input.timeRange;
    if (!_.isEqual(nextTimeRange, this.timeRange)) {
      this.timeRange = _.cloneDeep(nextTimeRange);
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

    if (this.searchSessionId !== this.input.searchSessionId) {
      this.searchSessionId = this.input.searchSessionId;
      dirty = true;
    }

    if (this.syncColors !== this.input.syncColors) {
      this.syncColors = this.input.syncColors;
      dirty = true;
    }

    if (this.syncTooltips !== this.input.syncTooltips) {
      this.syncTooltips = this.input.syncTooltips;
      dirty = true;
    }

    if (this.syncCursor !== this.input.syncCursor) {
      this.syncCursor = this.input.syncCursor;
      dirty = true;
    }

    if (this.embeddableTitle !== this.getTitle()) {
      this.embeddableTitle = this.getTitle();
      dirty = true;
    }

    if (this.vis.description && this.domNode) {
      this.domNode.setAttribute('data-description', this.vis.description);
    }

    return dirty;
  }

  private handleWarnings() {
    const warnings: React.ReactNode[] = [];
    if (this.getInspectorAdapters()?.requests) {
      this.deps
        .start()
        .plugins.data.search.showWarnings(this.getInspectorAdapters()!.requests!, (warning) => {
          if (
            warning.type === 'shard_failure' &&
            warning.reason.type === 'unsupported_aggregation_on_downsampled_index'
          ) {
            warnings.push(warning.reason.reason || warning.message);
            return true;
          }
          if (this.vis.type.suppressWarnings?.()) {
            // if the vis type wishes to supress all warnings, return true so the default logic won't pick it up
            return true;
          }
        });
    }

    if (this.warningDomNode) {
      render(<Warnings warnings={warnings || []} />, this.warningDomNode);
    }
  }

  // this is a hack to make editor still work, will be removed once we clean up editor
  // @ts-ignore
  hasInspector = () => Boolean(this.getInspectorAdapters());

  onContainerLoading = () => {
    this.renderComplete.dispatchInProgress();
    this.updateOutput({
      ...this.getOutput(),
      loading: true,
      rendered: false,
      error: undefined,
    });
  };

  onContainerData = () => {
    this.handleWarnings();
    this.updateOutput({
      ...this.getOutput(),
      loading: false,
    });
  };

  onContainerRender = () => {
    this.renderComplete.dispatchComplete();
    this.updateOutput({
      ...this.getOutput(),
      rendered: true,
    });
  };

  onContainerError = (error: ExpressionRenderError) => {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.renderComplete.dispatchError();

    if (isFallbackDataView(this.vis.data.indexPattern)) {
      error = new Error(
        i18n.translate('visualizations.missedDataView.errorMessage', {
          defaultMessage: `Could not find the {type}: {id}`,
          values: {
            id: this.vis.data.indexPattern.id ?? '-',
            type: this.vis.data.savedSearchId
              ? i18n.translate('visualizations.noSearch.label', {
                  defaultMessage: 'search',
                })
              : i18n.translate('visualizations.noDataView.label', {
                  defaultMessage: 'data view',
                }),
          },
        })
      );
    }

    this.updateOutput({
      ...this.getOutput(),
      rendered: true,
      error,
    });
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

    const warningDiv = document.createElement('div');
    warningDiv.className = 'visPanel__warnings';
    domNode.appendChild(warningDiv);
    this.warningDomNode = warningDiv;

    this.domNode = div;
    super.render(this.domNode);

    render(
      <KibanaThemeProvider theme$={getTheme().theme$}>
        <div className="visChart__spinner">
          <EuiLoadingChart mono size="l" />
        </div>
      </KibanaThemeProvider>,
      this.domNode
    );

    const expressions = getExpressions();
    this.handler = await expressions.loader(this.domNode, undefined, {
      renderMode: this.input.renderMode || 'view',
      onRenderError: (element: HTMLElement, error: ExpressionRenderError) => {
        this.onContainerError(error);
      },
      executionContext: this.getExecutionContext(),
    });

    this.subscriptions.push(
      this.handler.events$.subscribe(async (event) => {
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
          const triggerId = get(VIS_EVENT_TO_TRIGGER, event.name, VIS_EVENT_TO_TRIGGER.filter);
          let context;

          if (triggerId === VIS_EVENT_TO_TRIGGER.applyFilter) {
            context = {
              embeddable: this,
              timeFieldName: this.vis.data.indexPattern?.timeFieldName!,
              ...event.data,
            };
          } else {
            context = {
              embeddable: this,
              data: { timeFieldName: this.vis.data.indexPattern?.timeFieldName!, ...event.data },
            };
          }

          getUiActions().getTrigger(triggerId).exec(context);
        }
      })
    );

    if (this.vis.description) {
      div.setAttribute('data-description', this.vis.description);
    }

    div.setAttribute('data-test-subj', 'visualizationLoader');
    div.setAttribute('data-shared-item', '');

    this.subscriptions.push(this.handler.loading$.subscribe(this.onContainerLoading));
    this.subscriptions.push(this.handler.data$.subscribe(this.onContainerData));
    this.subscriptions.push(this.handler.render$.subscribe(this.onContainerRender));

    this.subscriptions.push(
      this.getUpdated$().subscribe(() => {
        const { error } = this.getOutput();

        if (error) {
          render(this.renderError(error), this.domNode);
        }
      })
    );

    await this.updateHandler();
  }

  private renderError(error: ErrorLike | string) {
    if (isFallbackDataView(this.vis.data.indexPattern)) {
      return (
        <VisualizationMissedSavedObjectError
          renderMode={this.input.renderMode ?? 'view'}
          savedObjectMeta={{
            savedObjectType: this.vis.data.savedSearchId ? 'search' : DATA_VIEW_SAVED_OBJECT_TYPE,
          }}
          application={getApplication()}
          message={typeof error === 'string' ? error : error.message}
        />
      );
    }

    return <VisualizationError error={error} />;
  }

  public destroy() {
    super.destroy();
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.vis.uiState.off('change', this.uiStateChangeHandler);
    this.vis.uiState.off('reload', this.reload);

    if (this.handler) {
      this.handler.destroy();
      this.handler.getElement().remove();
    }
  }

  public reload = async () => {
    await this.handleVisUpdate();
  };

  private getExecutionContext() {
    const parentContext = this.parent?.getInput().executionContext || getExecutionContext().get();
    const child: KibanaExecutionContext = {
      type: 'agg_based',
      name: this.vis.type.name,
      id: this.vis.id ?? 'new',
      description: this.vis.title || this.input.title || this.vis.type.name,
      url: this.output.editUrl,
    };

    return {
      ...parentContext,
      child,
    };
  }

  private async updateHandler() {
    const context = this.getExecutionContext();

    this.expressionVariables = await this.vis.type.getExpressionVariables?.(
      this.vis,
      this.timefilter
    );

    this.expressionVariablesSubject.next(this.expressionVariables);

    const expressionParams: IExpressionLoaderParams = {
      searchContext: {
        timeRange: this.timeRange,
        query: this.input.query,
        filters: this.input.filters,
        disableShardWarnings: true,
      },
      variables: {
        embeddableTitle: this.getTitle(),
        ...this.expressionVariables,
      },
      searchSessionId: this.input.searchSessionId,
      syncColors: this.input.syncColors,
      syncTooltips: this.input.syncTooltips,
      syncCursor: this.input.syncCursor,
      uiState: this.vis.uiState,
      interactive: !this.input.disableTriggers,
      inspectorAdapters: this.inspectorAdapters,
      executionContext: context,
    };
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const abortController = this.abortController;

    try {
      this.expression = await toExpressionAst(this.vis, {
        timefilter: this.timefilter,
        timeRange: this.timeRange,
        abortSignal: this.abortController!.signal,
      });
    } catch (e) {
      this.onContainerError(e);
    }

    if (this.handler && !abortController.signal.aborted) {
      await this.handler.update(this.expression, expressionParams);
    }
  }

  private handleVisUpdate = async () => {
    this.handleChanges();
    await this.updateHandler();
  };

  private uiStateChangeHandler = () => {
    this.updateInput({
      ...this.vis.uiState.toJSON(),
    });
  };

  public supportedTriggers(): string[] {
    return this.vis.type.getSupportedTriggers?.(this.vis.params) ?? [];
  }

  public getExpressionVariables$() {
    return this.expressionVariablesSubject.asObservable();
  }

  public getExpressionVariables() {
    return this.expressionVariables;
  }

  inputIsRefType = (input: VisualizeInput): input is VisualizeByReferenceInput => {
    if (!this.attributeService) {
      throw new Error('AttributeService must be defined for getInputAsRefType');
    }
    return this.attributeService.inputIsRefType(input as VisualizeByReferenceInput);
  };

  getInputAsValueType = async (): Promise<VisualizeByValueInput> => {
    const input = {
      savedVis: this.vis.serialize(),
    };
    delete input.savedVis.id;
    _.unset(input, 'savedVis.title');
    return new Promise<VisualizeByValueInput>((resolve) => {
      resolve({ ...(input as VisualizeByValueInput) });
    });
  };

  getInputAsRefType = async (): Promise<VisualizeByReferenceInput> => {
    const { savedObjectsClient, data, spaces, savedObjectsTaggingOss } = await this.deps.start()
      .plugins;
    const savedVis = await getSavedVisualization({
      savedObjectsClient,
      search: data.search,
      dataViews: data.dataViews,
      spaces,
      savedObjectsTagging: savedObjectsTaggingOss?.getTaggingApi(),
    });
    if (!savedVis) {
      throw new Error('Error creating a saved vis object');
    }
    if (!this.attributeService) {
      throw new Error('AttributeService must be defined for getInputAsRefType');
    }
    const saveModalTitle = this.getTitle()
      ? this.getTitle()
      : i18n.translate('visualizations.embeddable.placeholderTitle', {
          defaultMessage: 'Placeholder Title',
        });
    // @ts-ignore
    const attributes: VisualizeSavedObjectAttributes = {
      savedVis,
      vis: this.vis,
      title: this.vis.title,
    };
    return this.attributeService.getInputAsRefType(
      {
        id: this.id,
        attributes,
      },
      { showSaveModal: true, saveModalTitle }
    );
  };
}
