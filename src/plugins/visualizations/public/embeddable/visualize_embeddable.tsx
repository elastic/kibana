/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _, { get } from 'lodash';
import { Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { render } from 'react-dom';
import { EuiLoadingChart } from '@elastic/eui';
import { Filter, onlyDisabledFiltersChanged } from '@kbn/es-query';
import type { SavedObjectAttributes, KibanaExecutionContext } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { TimeRange, Query, TimefilterContract } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
  Embeddable,
  IContainer,
  Adapters,
  SavedObjectEmbeddableInput,
  ReferenceOrValueEmbeddable,
  AttributeService,
} from '@kbn/embeddable-plugin/public';
import {
  IExpressionLoaderParams,
  ExpressionLoader,
  ExpressionRenderError,
  ExpressionAstExpression,
} from '@kbn/expressions-plugin/public';
import type { RenderMode } from '@kbn/expressions-plugin';
import { VISUALIZE_EMBEDDABLE_TYPE } from './constants';
import { Vis, SerializedVis } from '../vis';
import { getExecutionContext, getExpressions, getTheme, getUiActions } from '../services';
import { VIS_EVENT_TO_TRIGGER } from './events';
import { VisualizeEmbeddableFactoryDeps } from './visualize_embeddable_factory';
import { getSavedVisualization } from '../utils/saved_visualize_utils';
import { VisSavedObject } from '../types';
import { toExpressionAst } from './to_ast';

const getKeys = <T extends {}>(o: T): Array<keyof T> => Object.keys(o) as Array<keyof T>;

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
  implements ReferenceOrValueEmbeddable<VisualizeByValueInput, VisualizeByReferenceInput>
{
  private handler?: ExpressionLoader;
  private timefilter: TimefilterContract;
  private timeRange?: TimeRange;
  private query?: Query;
  private filters?: Filter[];
  private searchSessionId?: string;
  private syncColors?: boolean;
  private embeddableTitle?: string;
  private visCustomizations?: Pick<VisualizeInput, 'vis' | 'table'>;
  private subscriptions: Subscription[] = [];
  private expression?: ExpressionAstExpression;
  private vis: Vis;
  private domNode: any;
  public readonly type = VISUALIZE_EMBEDDABLE_TYPE;
  private abortController?: AbortController;
  private readonly deps: VisualizeEmbeddableFactoryDeps;
  private readonly inspectorAdapters?: Adapters;
  private attributeService?: AttributeService<
    VisualizeSavedObjectAttributes,
    VisualizeByValueInput,
    VisualizeByReferenceInput
  >;

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
  public getDescription() {
    return this.vis.description;
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
        if (visCustomizations.vis) {
          this.vis.uiState.set('vis', visCustomizations.vis);
          getKeys(visCustomizations).forEach((key) => {
            this.vis.uiState.set(key, visCustomizations[key]);
          });
        }
        if (visCustomizations.table) {
          this.vis.uiState.set('table', visCustomizations.table);
        }
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

    if (this.searchSessionId !== this.input.searchSessionId) {
      this.searchSessionId = this.input.searchSessionId;
      dirty = true;
    }

    if (this.syncColors !== this.input.syncColors) {
      this.syncColors = this.input.syncColors;
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

  // this is a hack to make editor still work, will be removed once we clean up editor
  // @ts-ignore
  hasInspector = () => Boolean(this.getInspectorAdapters());

  onContainerLoading = () => {
    this.renderComplete.dispatchInProgress();
    this.updateOutput({ loading: true, error: undefined });
  };

  onContainerRender = () => {
    this.renderComplete.dispatchComplete();
    this.updateOutput({ loading: false, error: undefined });
  };

  onContainerError = (error: ExpressionRenderError) => {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.renderComplete.dispatchError();
    this.updateOutput({ loading: false, error });
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
    this.subscriptions.push(this.handler.render$.subscribe(this.onContainerRender));

    await this.updateHandler();
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

  private async updateHandler() {
    const parentContext = this.parent?.getInput().executionContext || getExecutionContext().get();
    const child: KibanaExecutionContext = {
      type: 'visualization',
      name: this.vis.type.name,
      id: this.vis.id ?? 'new',
      description: this.vis.title || this.input.title || this.vis.type.name,
      url: this.output.editUrl,
    };
    const context = {
      ...parentContext,
      child,
    };

    const expressionParams: IExpressionLoaderParams = {
      searchContext: {
        timeRange: this.timeRange,
        query: this.input.query,
        filters: this.input.filters,
      },
      variables: {
        embeddableTitle: this.getTitle(),
      },
      searchSessionId: this.input.searchSessionId,
      syncColors: this.input.syncColors,
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
    this.expression = await toExpressionAst(this.vis, {
      timefilter: this.timefilter,
      timeRange: this.timeRange,
      abortSignal: this.abortController!.signal,
    });

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
