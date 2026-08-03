import type { Filter, Query, TimeRange, ProjectRouting } from '@kbn/es-query';
import type { SavedObjectAttributes } from '@kbn/core/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Adapters } from '@kbn/inspector-plugin/public';
import type { ExpressionRenderError } from '@kbn/expressions-plugin/public';
import type { RenderMode } from '@kbn/expressions-plugin/common';
import type { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import type { SerializedVis, Vis } from '../../vis';
import type { VisSavedObject } from '../../types';
import type { AttributeService } from './attribute_service';
import type { VisualizationsStartDeps } from '../../plugin';
import { Embeddable } from './embeddable';
import type { EmbeddableInput, EmbeddableOutput } from './i_embeddable';
export interface VisualizeEmbeddableDeps {
    start: StartServicesGetter<Pick<VisualizationsStartDeps, 'inspector' | 'embeddable' | 'data' | 'savedObjectsTaggingOss' | 'spaces'>>;
}
export interface VisualizeEmbeddableConfiguration {
    vis: Vis;
    indexPatterns?: DataView[];
    editPath: string;
    editUrl: string;
    capabilities: {
        visualizeSave: boolean;
        dashboardSave: boolean;
        visualizeOpen: boolean;
    };
    deps: VisualizeEmbeddableDeps;
}
export interface VisualizeInput extends EmbeddableInput {
    vis?: {
        colors?: {
            [key: string]: string;
        };
    };
    savedVis?: SerializedVis;
    renderMode?: RenderMode;
    table?: unknown;
    query?: Query;
    filters?: Filter[];
    timeRange?: TimeRange;
    timeslice?: [number, number];
    projectRouting?: ProjectRouting;
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
export type VisualizeByValueInput = {
    attributes: VisualizeSavedObjectAttributes;
} & VisualizeInput;
export type VisualizeByReferenceInput = {
    savedObjectId: string;
} & VisualizeInput;
/** @deprecated
 * VisualizeEmbeddable is no longer registered with the legacy embeddable system and is only
 * used within the visualize editor.
 */
export declare class VisualizeEmbeddable extends Embeddable<VisualizeInput, VisualizeOutput> {
    private handler?;
    private timefilter;
    private timeRange?;
    private query?;
    private filters?;
    private searchSessionId?;
    private syncColors?;
    private syncTooltips?;
    private syncCursor?;
    private embeddableTitle?;
    private visCustomizations?;
    private subscriptions;
    private expression?;
    private vis;
    private domNode;
    private warningDomNode;
    readonly type = "legacy_vis";
    private abortController?;
    private readonly deps;
    private readonly inspectorAdapters?;
    private attributeService?;
    private expressionVariables;
    private readonly expressionVariablesSubject;
    constructor(timefilter: TimefilterContract, { vis, editPath, editUrl, indexPatterns, deps, capabilities }: VisualizeEmbeddableConfiguration, initialInput: VisualizeInput, attributeService?: AttributeService);
    reportsEmbeddableLoad(): boolean;
    getVis(): Vis<import("@kbn/visualizations-common").VisParams>;
    /**
     * Gets the Visualize embeddable's local filters
     * @returns Local/panel-level array of filters for Visualize embeddable
     */
    getFilters(): Filter[];
    /**
     * Gets the Visualize embeddable's local query
     * @returns Local/panel-level query for Visualize embeddable
     */
    getQuery(): Query | import("@kbn/es-query").AggregateQuery | undefined;
    getInspectorAdapters: () => Adapters | undefined;
    openInspector: () => import("@kbn/core/public").OverlayRef | undefined;
    /**
     * Transfers all changes in the containerState.customization into
     * the uiState of this visualization.
     */
    transferCustomizationsToUiState(): void;
    private handleChanges;
    private handleWarnings;
    hasInspector: () => boolean;
    onContainerLoading: () => void;
    onContainerData: () => void;
    onContainerRender: () => void;
    onContainerError: (error: ExpressionRenderError) => void;
    /**
     *
     * @param {Element} domNode
     */
    render(domNode: HTMLElement): Promise<void>;
    private renderError;
    destroy(): void;
    reload: () => Promise<void>;
    private getExecutionContext;
    private updateHandler;
    private handleVisUpdate;
    private uiStateChangeHandler;
    supportedTriggers(): string[];
    getExpressionVariables$(): import("rxjs").Observable<Record<string, unknown> | undefined>;
    getExpressionVariables(): Record<string, unknown> | undefined;
    inputIsRefType: (input: VisualizeInput) => input is VisualizeByReferenceInput;
    getInputAsValueType: () => Promise<VisualizeByValueInput>;
    getInputAsRefType: () => Promise<VisualizeByReferenceInput>;
}
