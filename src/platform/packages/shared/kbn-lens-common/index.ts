/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
export type {
  IndexPatternRef,
  IndexPatternField,
  DateRange,
  PersistableFilter,
  SortingHint,
  ValueLabelConfig,
  IndexPattern,
  IndexPatternMap,
  PublicAPIProps,
  FieldOnlyDataType,
  DataType,
  Operation,
  OperationMetadata,
  OperationDescriptor,
  DataSourceInfo,
  VisualizationInfo,
  UserMessagesDisplayLocationId,
  UserMessage,
  UserMessageFilters,
  UserMessagesGetter,
  AddUserMessages,
  VisualizationType,
  TimeScaleUnit,
  ValueFormatConfig,
  DataViewsState,
  FramePublicAPI,
  VisualizationMap,
  DatasourceMap,
  DatasourcePublicAPI,
  Datasource,
  Suggestion,
} from './lens/types';
export type {
  FormBasedLayer,
  FormBasedPersistedState,
  PersistedIndexPatternLayer,
  FormBasedPrivateState,
  TextBasedLayer,
  TextBasedLayerColumn,
  GenericIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  ReferenceBasedIndexPatternColumn,
  IncompleteColumn,
  BaseIndexPatternColumn,
  TextBasedPersistedState,
  FormattedIndexPatternColumn,
  FormulaPublicApi,
  OperationType,
  DatasourceStates,
} from './lens/datasources/types';

export type {
  TermsIndexPatternColumn,
  FiltersIndexPatternColumn,
  CardinalityIndexPatternColumn,
  PercentileIndexPatternColumn,
  PercentileRanksIndexPatternColumn,
  MinIndexPatternColumn,
  AvgIndexPatternColumn,
  SumIndexPatternColumn,
  MaxIndexPatternColumn,
  MedianIndexPatternColumn,
  StandardDeviationIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  CumulativeSumIndexPatternColumn,
  CounterRateIndexPatternColumn,
  DerivativeIndexPatternColumn,
  MovingAverageIndexPatternColumn,
  OverallSumIndexPatternColumn,
  OverallMinIndexPatternColumn,
  OverallMaxIndexPatternColumn,
  OverallAverageIndexPatternColumn,
  TimeScaleIndexPatternColumn,
  CountIndexPatternColumn,
  LastValueIndexPatternColumn,
  RangeIndexPatternColumn,
  FormulaIndexPatternColumn,
  MathIndexPatternColumn,
  TimeRangeIndexPatternColumn,
  NowIndexPatternColumn,
  IntervalIndexPatternColumn,
  StaticValueIndexPatternColumn,
  MetricColumn,
  RangeTypeLens,
  FullRangeTypeLens,
  RangeType,
  MODES_TYPES,
  LensAggFilter,
  LensAggFilterValue,
  LensConstantContextValues,
  ConstantsIndexPatternColumn,
  OverallMetricIndexPatternColumn,
  AnyLensColumnWithSourceField,
  AnyLensColumnWithReferences,
  LensColumnWithMeta,
  LensColumn,
  GenericLensColumnWithMeta,
} from './lens/datasources/operations';
export type {
  CategoryDisplayType,
  NumberDisplayType,
  LegendDisplayType,
  LensLayerType,
  CollapseFunction,
  Visualization,
  VisualizationState,
} from './lens/visualizations/types';
export type {
  LensDatatableSortingState,
  LensDatatablePagingState,
  LensDatatableArgs,
  LensGridDirection,
  DatatableColumnConfig,
  DatatableColumnArgs,
  DatatableColumnResult,
  ColumnState,
  RowHeightMode,
  DataGridDensity,
} from './lens/visualizations/datatable/types';
export type { GaugeAccessors, GaugeVisualizationState } from './lens/visualizations/gauge/types';
export type {
  HeatmapPalette,
  HeatmapVisualizationState,
} from './lens/visualizations/heatmap/types';
export type {
  LegacyMetricState,
  LegacyMetricLabelPositionType,
  LegacyMetricAlignment,
} from './lens/visualizations/legacy_metric/types';
export type {
  ValueFontMode,
  SecondaryTrendType,
  SecondaryTrend,
  MetricVisualizationState,
  MetricVisualizationStateOptionals,
} from './lens/visualizations/metric/types';
export type {
  SharedPartitionLayerState,
  LensPartitionLayerState,
  LensPartitionVisualizationState,
} from './lens/visualizations/partition/types';
export type { LensTagcloudState, LensTagcloudConfig } from './lens/visualizations/tagcloud/types';
export type {
  YAxisMode,
  SeriesType,
  AxisConfig,
  LabelsOrientationConfig,
  YConfig,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
  XYByValueAnnotationLayerConfig,
  XYByReferenceAnnotationLayerConfig,
  XYAnnotationLayerConfig,
  XYLayerConfig,
  ValidXYDataLayerConfig,
  ValidLayer,
  XYState,
  State,
} from './lens/visualizations/xy/types';
export type {
  LensEmbeddableInput,
  TypedLensByValueInput,
  LensSerializedState,
  LensByReferenceInput,
  LensSavedObjectAttributes,
} from './lens/embeddable/types';
export type {
  LensAppLocatorParams,
  MainHistoryLocationState,
  LensShareableState,
  LensAppLocator,
} from './lens/locator_types';

/**
 * Constants are used by both the expression language and the lens code
 */
export { INDEX_PATTERN_TYPE, LENS_DOCUMENT_FIELD_NAME } from './lens/datasources/constants';
export {
  LENS_CATEGORY_DISPLAY,
  LENS_NUMBER_DISPLAY,
  LENS_LEGEND_DISPLAY,
  LENS_LAYER_TYPES,
  LEGEND_SIZE,
  LENS_LEGEND_LAYOUT,
} from './lens/visualizations/constants';
export {
  LENS_DATATABLE_ID,
  LENS_DATATABLE_COLUMN,
  LENS_DATAGRID_DENSITY,
  LENS_ROW_HEIGHT_MODE,
} from './lens/visualizations/datatable/constants';
export {
  LENS_GAUGE_ID,
  GAUGE_SHAPES,
  GAUGE_TICKS_POSITIONS,
  GAUGE_LABEL_MAJOR_MODES,
  GAUGE_CENTRAL_MAJOR_MODES,
  GAUGE_COLOR_MODES,
  LENS_GAUGE_GROUP_ID,
  GAUGE_TITLES_BY_TYPE,
} from './lens/visualizations/gauge/constants';
export {
  LENS_HEATMAP_ID,
  LENS_HEATMAP_CHART_SHAPES,
  LENS_HEATMAP_CHART_NAMES,
  LENS_HEATMAP_GROUP_ID,
  HEATMAP_NAME,
  HEATMAP_LEGEND_NAME,
  HEATMAP_GRID_NAME,
  LENS_HEATMAP_DEFAULT_PALETTE_NAME,
  LENS_HEATMAP_DEFAULT_PALETTE_PARAMS,
} from './lens/visualizations/heatmap/constants';
export {
  LEGACY_METRIC_LABEL_POSITION,
  LENS_LEGACY_METRIC_DEFAULT_TITLE_POSITION,
  LENS_LEGACY_METRIC_DEFAULT_TITLE_SIZE,
  LENS_LEGACY_METRIC_DEFAULT_TEXT_ALIGNMENT,
} from './lens/visualizations/legacy_metric/constants';
export {
  LENS_METRIC_ID,
  LENS_METRIC_GROUP_ID,
  LENS_METRIC_STATE_DEFAULTS,
  LENS_METRIC_SECONDARY_DEFAULT_STATIC_COLOR,
  LENS_METRIC_DEFAULT_TRENDLINE_NAME,
  METRIC_TRENDLINE_NAME,
  LENS_METRIC_LABEL_POSITION,
  LENS_METRIC_SECONDARY_BASELINE_DEFAULT_VALUE,
  LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS,
  LENS_METRIC_AVAILABLE_METRIC_ICONS,
} from './lens/visualizations/metric/constants';
export {
  PARTITION_CHART_TYPES,
  PARTITION_EMPTY_SIZE_RADIUS,
  PARTITION_LABEL_POSITIONS,
  PARTITION_VALUE_FORMATS,
  LENS_PARTITION_DEFAULT_PERCENT_DECIMALS,
} from './lens/visualizations/partition/constants';
export {
  TAGCLOUD_ORIENTATION,
  TAGCLOUD_SCALE_OPTIONS,
  LENS_TAGCLOUD_DEFAULT_STATE,
} from './lens/visualizations/tagcloud/constants';
export type {
  YAxisModes,
  SeriesTypes,
  visualizationSubtypes,
  visualizationTypes,
} from './lens/visualizations/xy/constants';
export { LENS_SHARE_STATE_ACTION } from './lens/locator_types';
export { defaultSeriesType } from './lens/visualizations/xy/types';
