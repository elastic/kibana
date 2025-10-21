/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AggregateQuery,
  ExecutionContextSearch,
  Filter,
  Query,
  TimeRange,
} from '@kbn/es-query';
import type { DataViewSpec, DataView } from '@kbn/data-views-plugin/common';
import type { Simplify } from '@kbn/chart-expressions-common';
import type { KibanaExecutionContext, OverlayRef } from '@kbn/core/public';
import type {
  ExpressionRendererEvent,
  ReactExpressionRendererProps,
  ReactExpressionRendererType,
} from '@kbn/expressions-plugin/public';
import type { AllowedChartOverrides, AllowedSettingsOverrides } from '@kbn/charts-plugin/common';
import type { AllowedXYOverrides } from '@kbn/expression-xy-plugin/common';
import type { AllowedPartitionOverrides } from '@kbn/expression-partition-vis-plugin/common';
import type { AllowedGaugeOverrides } from '@kbn/expression-gauge-plugin/common';
import type { Reference } from '@kbn/content-management-utils';
import type {
  HasEditCapabilities,
  HasLibraryTransforms,
  HasSupportedTriggers,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesDisabledActionIds,
  PublishesRendered,
  PublishesSavedObjectId,
  PublishesUnifiedSearch,
  PublishesViewMode,
  PublishesWritableDescription,
  PublishesWritableTitle,
  PublishingSubject,
  SerializedTitles,
  ViewMode,
} from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type {
  BrushTriggerEvent,
  ClickTriggerEvent,
  MultiClickTriggerEvent,
} from '@kbn/charts-plugin/public';
import type { PaletteOutput } from '@kbn/coloring';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { InspectorOptions } from '@kbn/inspector-plugin/public';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import type { DefaultInspectorAdapters, RenderMode } from '@kbn/expressions-plugin/common';
import type { CanAddNewPanel } from '@kbn/presentation-containers';
import type { Ast } from '@kbn/interpreter';
import type {
  IndexPatternMap,
  IndexPatternRef,
  LensDocument,
  LensInspector,
  SharingSavedObjectProps,
  TableInspectorAdapter,
  UserMessage,
  VisualizationDisplayOptions,
} from '../types';
import type { FormBasedPersistedState, TextBasedPersistedState } from '../datasources/types';
import type { XYState } from '../visualizations/xy/types';
import type { HeatmapVisualizationState } from '../visualizations/heatmap/types';
import type { GaugeVisualizationState } from '../visualizations/gauge/types';
import type { LegacyMetricState } from '../visualizations/legacy_metric/types';
import type { MetricVisualizationState } from '../visualizations/metric/types';
import type { LensPartitionVisualizationState } from '../visualizations/partition/types';
import type { DatatableVisualizationState } from '../visualizations/datatable/types';
import type { LensTableRowContextMenuEvent } from '../visualizations/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LensApiProps {}

export type LensSavedObjectAttributes = Omit<LensDocument, 'savedObjectId' | 'type'>;

/**
 * This visualization context can have a different attributes than the
 * one stored in the Lens API attributes
 */
export interface VisualizationContext {
  activeAttributes: LensDocument | undefined;
  mergedSearchContext: ExecutionContextSearch;
  indexPatterns: IndexPatternMap;
  indexPatternRefs: IndexPatternRef[];
  activeVisualizationState: unknown;
  activeDatasourceState: unknown;
  activeData?: TableInspectorAdapter;
}

export interface VisualizationContextHelper {
  // the doc prop here is a convenience reference to the internalApi.attributes
  getVisualizationContext: () => VisualizationContext;
  updateVisualizationContext: (newContext: Partial<VisualizationContext>) => void;
}

export interface ViewUnderlyingDataArgs {
  dataViewSpec: DataViewSpec;
  timeRange: TimeRange;
  filters: Filter[];
  query: Query | AggregateQuery | undefined;
  columns: string[];
}

export interface DocumentToExpressionReturnType {
  ast: Ast | null;
  indexPatterns: IndexPatternMap;
  indexPatternRefs: IndexPatternRef[];
  activeVisualizationState: unknown;
  activeDatasourceState: unknown;
}

export interface PreventableEvent {
  preventDefault(): void;
}

interface LensByValue {
  // by-value
  attributes?: Simplify<LensSavedObjectAttributes>;
}

export interface LensOverrides {
  /**
   * Overrides can tweak the style of the final embeddable and are executed at the end of the Lens rendering pipeline.
   * Each visualization type offers various type of overrides, per component (i.e. 'setting', 'axisX', 'partition', etc...)
   *
   * While it is not possible to pass function/callback/handlers to the renderer, it is possible to overwrite
   * the current behaviour by passing the "ignore" string to the override prop (i.e. onBrushEnd: "ignore" to stop brushing)
   */
  overrides?:
    | AllowedChartOverrides
    | AllowedSettingsOverrides
    | AllowedXYOverrides
    | AllowedPartitionOverrides
    | AllowedGaugeOverrides;
}

/**
 * Lens embeddable props broken down by type
 */

export interface LensByReference {
  // by-reference
  savedObjectId?: string;
}

interface ContentManagementProps {
  sharingSavedObjectProps?: SharingSavedObjectProps;
  managed?: boolean;
}

export type LensPropsVariants = (LensByValue & LensByReference) & {
  references?: Reference[];
};

export interface ViewInDiscoverCallbacks extends LensApiProps {
  canViewUnderlyingData$: PublishingSubject<boolean>;
  loadViewUnderlyingData: () => void;
  getViewUnderlyingDataArgs: () => ViewUnderlyingDataArgs | undefined;
}

export interface IntegrationCallbacks extends LensApiProps {
  isTextBasedLanguage: () => boolean | undefined;
  getTextBasedLanguage: () => string | undefined;
  getSavedVis: () => Readonly<LensSavedObjectAttributes | undefined>;
  getFullAttributes: () => LensDocument | undefined;
  updateAttributes: (newAttributes: LensRuntimeState['attributes']) => void;
  updateSavedObjectId: (newSavedObjectId: LensRuntimeState['savedObjectId']) => void;
  updateOverrides: (newOverrides: LensOverrides['overrides']) => void;
  getTriggerCompatibleActions: (triggerId: string, context: object) => Promise<Action[]>;
}

/**
 * Public Callbacks are function who are exposed thru the Lens custom renderer component,
 * so not directly exposed in the Lens API, rather passed down as parentApi to the Lens Embeddable
 */
export interface LensPublicCallbacks extends LensApiProps {
  onBrushEnd?: (data: Simplify<BrushTriggerEvent['data'] & PreventableEvent>) => void;
  onLoad?: (
    isLoading: boolean,
    adapters?: Partial<DefaultInspectorAdapters>,
    dataLoading$?: PublishingSubject<boolean | undefined>
  ) => void;
  onFilter?: (
    data: Simplify<(ClickTriggerEvent['data'] | MultiClickTriggerEvent['data']) & PreventableEvent>
  ) => void;
  onTableRowClick?: (
    data: Simplify<LensTableRowContextMenuEvent['data'] & PreventableEvent>
  ) => void;
  /**
   * Let the consumer overwrite embeddable user messages
   */
  onBeforeBadgesRender?: (userMessages: UserMessage[]) => UserMessage[];
  onAlertRule?: (data: unknown) => void;
}

/**
 * API callbacks are function who are used by direct Embeddable consumers (i.e. Dashboard or our own Lens custom renderer)
 */
export type LensApiCallbacks = Simplify<ViewInDiscoverCallbacks & IntegrationCallbacks>;

export interface LensUnifiedSearchContext {
  filters?: Filter[];
  query?: Query | AggregateQuery;
  timeRange?: TimeRange;
  timeslice?: [number, number];
  searchSessionId?: string;
  lastReloadRequestTime?: number;
}

export interface LensPanelProps {
  id?: string;
  renderMode?: ViewMode;
  disableTriggers?: boolean;
  syncColors?: boolean;
  syncTooltips?: boolean;
  syncCursor?: boolean;
  palette?: PaletteOutput;
}

/**
 * This set of props are exposes by the Lens component too
 */
export interface LensSharedProps {
  executionContext?: KibanaExecutionContext;
  style?: React.CSSProperties;
  className?: string;
  noPadding?: boolean;
  viewMode?: ViewMode;
  forceDSL?: boolean;
  esqlVariables?: ESQLControlVariable[];
}

interface LensRequestHandlersProps {
  /**
   * Custom abort controller to be used for the ES client
   */
  abortController?: AbortController;
}

/**
 * Compose together all the props and make them inspectable via Simplify
 *
 * The LensSerializedState is the state stored for a dashboard panel
 * that contains:
 * * Lens document state
 * * Panel settings
 * * other props from the embeddable
 */
export type LensSerializedState = Simplify<
  LensPropsVariants &
    LensOverrides &
    LensUnifiedSearchContext &
    LensPanelProps &
    SerializedTitles &
    Omit<LensSharedProps, 'noPadding'> &
    Partial<DynamicActionsSerializedState> & { isNewPanel?: boolean }
>;

/**
 * Custom props exposed on the Lens exported component
 */
export type LensComponentProps = Simplify<
  LensRequestHandlersProps &
    LensSharedProps & {
      /**
       * When enabled the Lens component will render as a dashboard panel
       */
      withDefaultActions?: boolean;
      /**
       * Allow custom actions to be rendered in the panel
       */
      extraActions?: Action[];
      /**
       * Disable specific actions for the embeddable
       */
      disabledActions?: string[];
      /**
       * Toggles the inspector
       */
      showInspector?: boolean;
      /**
       * Toggle inline editing feature
       */
      canEditInline?: boolean;
    }
>;

/**
 * This is the subset of props that from the LensComponent will be forwarded to the Lens embeddable
 */
export type LensComponentForwardedProps = Pick<
  LensComponentProps,
  | 'style'
  | 'className'
  | 'noPadding'
  | 'abortController'
  | 'executionContext'
  | 'viewMode'
  | 'forceDSL'
>;

/**
 * Carefully chosen props to expose on the Lens renderer component used by
 * other plugins
 */

type ComponentProps = LensComponentProps & LensPublicCallbacks;
type ComponentSerializedProps = TypedLensSerializedState;

type LensRendererPrivateProps = ComponentSerializedProps & ComponentProps;
export type LensRendererProps = LensRendererPrivateProps;

/**
 * The LensRuntimeState is the state stored for a dashboard panel
 * that contains:
 * * Lens document state
 * * Panel settings
 * * other props from the embeddable
 */
export type LensRuntimeState = Simplify<
  Omit<ComponentSerializedProps, 'attributes' | 'references'> & {
    attributes: NonNullable<LensSerializedState['attributes']>;
  } & Pick<
      LensComponentForwardedProps,
      'viewMode' | 'abortController' | 'executionContext' | 'forceDSL'
    > &
    ContentManagementProps
>;

export interface LensHasEditPanel {
  getEditPanel?: (options?: {
    closeFlyout?: () => void;
    showOnly?: boolean;
  }) => Promise<JSX.Element | undefined>;
}

export interface LensInspectorAdapters {
  getInspectorAdapters: () => Adapters;
  inspect: (options?: InspectorOptions) => OverlayRef;
  closeInspector: () => Promise<void>;
  // expose a handler for the inspector adapters
  // to be able to subscribe to changes
  // a typical use case is the inline editing, where the editor
  // needs to be updated on data changes
  adapters$: PublishingSubject<Adapters>;
}

export type LensApi = Simplify<
  DefaultEmbeddableApi<LensSerializedState> &
    // This is used by actions to operate the edit action
    HasEditCapabilities &
    // for blocking errors leverage the embeddable panel UI
    PublishesBlockingError &
    // This is used by dashboard/container to show filters/queries on the panel
    PublishesUnifiedSearch &
    // Forward the search session id
    PublishesSearchSession &
    // Let the container know the loading state
    PublishesDataLoading &
    // Let the container know when the rendering has completed rendering
    PublishesRendered &
    // Let the container know the used data views
    PublishesDataViews &
    // Let the container operate on panel title/description
    PublishesWritableTitle &
    PublishesWritableDescription &
    // This embeddable can narrow down specific triggers usage
    HasSupportedTriggers &
    PublishesDisabledActionIds &
    // Offers methods to operate from/on the linked saved object
    HasLibraryTransforms<LensSerializedState, LensSerializedState> &
    // Let the container know the view mode
    PublishesViewMode &
    // Let the container know the saved object id
    PublishesSavedObjectId &
    // Lens specific API methods:
    // Let the container know when the data has been loaded/updated
    LensInspectorAdapters &
    LensRequestHandlersProps &
    LensApiCallbacks &
    LensHasEditPanel
>;

// This is an API only used internally to the embeddable but not exported elsewhere
// there's some overlapping between this and the LensApi but they are shared references
export type LensInternalApi = Simplify<
  Pick<IntegrationCallbacks, 'updateAttributes' | 'updateOverrides'> &
    PublishesDataViews &
    VisualizationContextHelper & {
      esqlVariables$: PublishingSubject<ESQLControlVariable[]>;
      attributes$: PublishingSubject<LensRuntimeState['attributes']>;
      overrides$: PublishingSubject<LensOverrides['overrides']>;
      disableTriggers$: PublishingSubject<LensPanelProps['disableTriggers']>;
      dataLoading$: PublishingSubject<boolean | undefined>;
      hasRenderCompleted$: PublishingSubject<boolean>;
      isNewlyCreated$: PublishingSubject<boolean>;
      setAsCreated: () => void;
      dispatchRenderStart: () => void;
      dispatchRenderComplete: () => void;
      dispatchError: () => void;
      updateDataLoading: (newDataLoading: boolean | undefined) => void;
      expressionParams$: PublishingSubject<ExpressionWrapperProps | null>;
      updateExpressionParams: (newParams: ExpressionWrapperProps | null) => void;
      expressionAbortController$: PublishingSubject<AbortController | undefined>;
      updateAbortController: (newAbortController: AbortController | undefined) => void;
      renderCount$: PublishingSubject<number>;
      updateDataViews: (dataViews: DataView[] | undefined) => void;
      updateDisabledTriggers: (disableTriggers: LensPanelProps['disableTriggers']) => void;
      messages$: PublishingSubject<UserMessage[]>;
      updateMessages: (newMessages: UserMessage[]) => void;
      validationMessages$: PublishingSubject<UserMessage[]>;
      updateValidationMessages: (newMessages: UserMessage[]) => void;
      blockingError$: PublishingSubject<Error | undefined>;
      updateBlockingError: (newBlockingError: Error | undefined) => void;
      resetAllMessages: () => void;
      getDisplayOptions: () => VisualizationDisplayOptions;
    }
>;

export interface ExpressionWrapperProps {
  ExpressionRenderer: ReactExpressionRendererType;
  expression: string | null;
  variables?: Record<string, unknown>;
  interactive?: boolean;
  searchContext: ExecutionContextSearch;
  searchSessionId?: string;
  handleEvent: (event: ExpressionRendererEvent) => void;
  onData$: (
    data: unknown,
    inspectorAdapters?: Partial<DefaultInspectorAdapters> | undefined
  ) => void;
  onRender$: (count: number) => void;
  renderMode?: RenderMode;
  syncColors?: boolean;
  syncTooltips?: boolean;
  syncCursor?: boolean;
  hasCompatibleActions?: ReactExpressionRendererProps['hasCompatibleActions'];
  getCompatibleCellValueActions?: ReactExpressionRendererProps['getCompatibleCellValueActions'];
  style?: React.CSSProperties;
  className?: string;
  addUserMessages: (messages: UserMessage[]) => void;
  onRuntimeError: (error: Error) => void;
  executionContext?: KibanaExecutionContext;
  lensInspector: LensInspector;
  noPadding?: boolean;
  abortController?: AbortController;
}

export type GetStateType = () => LensRuntimeState;

export interface StructuredDatasourceStates {
  formBased?: FormBasedPersistedState;
  textBased?: TextBasedPersistedState;
}

/** Utility type to build typed version for each chart */
type TypedLensAttributes<TVisType, TVisState> = Simplify<
  Omit<LensDocument, 'savedObjectId' | 'type' | 'state' | 'visualizationType'> & {
    visualizationType: TVisType;
    state: Simplify<
      Omit<LensDocument['state'], 'datasourceStates' | 'visualization'> & {
        datasourceStates: {
          // This is of type StructuredDatasourceStates but does not conform to Record<string, unknown>
          // so I am leaving this alone until we improve this datasource typing structure.
          formBased?: FormBasedPersistedState;
          textBased?: TextBasedPersistedState;
        };
        visualization: TVisState;
      }
    >;
  }
>;

/**
 * Type-safe variant of by value embeddable input for Lens.
 * This can be used to hardcode certain Lens chart configurations within another app.
 */
export type TypedLensSerializedState = Simplify<
  Omit<LensSerializedState, 'attributes'> & {
    attributes:
      | TypedLensAttributes<'lnsXY', XYState>
      | TypedLensAttributes<'lnsPie', LensPartitionVisualizationState>
      | TypedLensAttributes<'lnsHeatmap', HeatmapVisualizationState>
      | TypedLensAttributes<'lnsGauge', GaugeVisualizationState>
      | TypedLensAttributes<'lnsDatatable', DatatableVisualizationState>
      | TypedLensAttributes<'lnsLegacyMetric', LegacyMetricState>
      | TypedLensAttributes<'lnsMetric', MetricVisualizationState>
      | TypedLensAttributes<string, unknown>;
  }
>;

/**
 * Backward compatibility types
 */
export type LensByValueInput = Omit<LensRendererPrivateProps, 'savedObjectId'>;
export type LensByReferenceInput = Omit<LensRendererPrivateProps, 'attributes'>;
export type TypedLensByValueInput = Omit<LensRendererProps, 'savedObjectId'>;
export type LensEmbeddableInput = LensByValueInput | LensByReferenceInput;
export type LensEmbeddableOutput = LensApi;

export interface ESQLVariablesCompatibleDashboardApi {
  esqlVariables$: PublishingSubject<ESQLControlVariable[]>;
  controlGroupApi$: PublishingSubject<Partial<CanAddNewPanel> | undefined>;
  children$: PublishingSubject<{ [key: string]: unknown }>;
}
