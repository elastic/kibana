/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: https://github.com/elastic/kibana/issues/110891

/** @public types */
export type {
  VisParams,
  SavedVisState,
  VisualizationSavedObjectAttributes,
  VisualizationSavedObject,
  SerializedVisData,
  SerializedVis,
  SupportedAggregation,
  GenericSchemaConfig,
  SchemaConfig,
} from './types';
export type { Dimension, PaletteConfig } from './utils';
export {
  prepareLogTable,
  findAccessor,
  findAccessorOrFail,
  getAccessorByDimension,
  validateAccessor,
  getColumnByAccessor,
  isVisDimension,
  getAccessor,
  getFormatByAccessor,
  getStopsWithColorsFromRanges,
  type InspectorLogTable,
} from './utils';
export type {
  Arguments,
  ExpressionValueVisDimension,
  ExpressionFunctionVisDimension,
} from './expression_functions';
export { range, visDimension } from './expression_functions';
export type {
  AggBasedColumn,
  TimeScaleUnit,
  FilterQuery,
  Filter,
  Range,
  NumberValueFormat,
  MinMax,
  BasicFullPercentageModeConfig,
  BasicPercentageModeConfig,
  PercentageModeConfigWithMinMax,
  PercentageModeConfig,
  RangeMode,
  FormatParams,
  FiltersParams,
  TermsParams,
  DateHistogramParams,
  RangeParams,
  MinParams,
  MaxParams,
  AvgParams,
  SumParams,
  MedianParams,
  StandardDeviationParams,
  CardinalityParams,
  CumulativeSumParams,
  CounterRateParams,
  DerivativeParams,
  CountParams,
  PercentileParams,
  PercentileRanksParams,
  LastValueParams,
  MovingAverageParams,
  FormulaParams,
  StaticValueParams,
  TimeScaleParams,
  OperationWithSourceField,
  OperationWithReferences,
  BaseColumn,
  ColumnWithSourceField,
  ColumnWithReferences,
  FiltersColumn,
  RangeColumn,
  TermsColumn,
  DateHistogramColumn,
  MinColumn,
  MaxColumn,
  AvgColumn,
  SumColumn,
  MedianColumn,
  StandardDeviationColumn,
  CardinalityColumn,
  PercentileColumn,
  PercentileRanksColumn,
  CountColumn,
  LastValueColumn,
  CumulativeSumColumn,
  CounterRateColumn,
  DerivativeColumn,
  MovingAverageColumn,
  FormulaColumn,
  StaticValueColumn,
  AnyColumnWithSourceField,
  AnyColumnWithReferences,
  Column,
  GenericColumnWithMeta,
  ColumnWithMeta,
  Layer,
  NavigateToLensContext,
  // ChartShapes,
  FillType,
  // SeriesType,
  // YAxisMode,
  XYCurveType,
  AxisExtentConfig,
  // YConfig,
  // XYDataLayerConfig,
  // XYReferenceLineLayerConfig,
  EventAnnotationConfig,
  XYAnnotationsLayerConfig,
  // XYLayerConfig,
  AxesSettingsConfig,
  // LabelsOrientationConfig,
  LegendConfig,
  XYConfiguration,
  SortingState,
  PagingState,
  ColumnState,
  TableVisConfiguration,
  MetricVisConfiguration,
  // PartitionLayerState,
  PartitionVisConfiguration,
  GaugeVisConfiguration,
  // HeatmapLegendConfig,
  // HeatmapGridConfig,
  // HeatmapArguments,
  // HeatmapLayerState,
  // HeatmapConfiguration,
  TagcloudVisConfiguration,
  Configuration,
} from './convert_to_lens';
export {
  OperationsWithSourceField,
  OperationsWithReferences,
  Operations,
  XYCurveTypes,
  FillTypes,
  RANGE_MODES,
  isAnnotationsLayer,
  getIndexPatternIds,
  isFieldValid,
  isCollapseFunction,
  excludeMetaFromColumn,
} from './convert_to_lens';
export { convertToSchemaConfig } from './vis_schemas';

export {
  // LegendSize,
  LegendSizeToPixels,
  // DEFAULT_LEGEND_SIZE,
  // LegendLayout,
  type XYLegendValue,
} from './constants';

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
} from './lens/lens_types';
export type {
  FormBasedLayer,
  FormBasedPersistedState,
  PersistedIndexPatternLayer,
  FormBasedPrivateState,
} from './lens/datasources/lens_types';
export type { LegendSize, LegendLayout } from './lens/visualizations/expression_types';
export type {
  CategoryDisplayType,
  NumberDisplayType,
  LegendDisplayType,
  LensLayerType,
  CollapseFunction,
} from './lens/visualizations/lens_types';
export * from './lens/visualizations/datatable/expression_types';
export type {
  LensDatatableSortingState,
  LensDatatablePagingState,
  LensDatatableArgs,
  LensGridDirection,
  DatatableColumnConfig,
  DatatableColumnArgs,
  DatatableColumnResult,
  ColumnState,
} from './lens/visualizations/datatable/lens_types';
export type {
  GaugeColorMode,
  GaugeShape,
  GaugeLabelMajorMode,
  GaugeCentralMajorMode,
  GaugeTicksPosition,
  GaugeExpressionArgs,
} from './lens/visualizations/gauge/expression_types';
export type {
  GaugeAccessors,
  GaugeVisualizationState,
} from './lens/visualizations/gauge/lens_types';
export type {
  HeatmapChartShapes,
  HeatmapLegendConfigResult,
  HeatmapGridConfigResult,
  HeatmapExpressionLayerState,
} from './lens/visualizations/heatmap/expression_types';
export type {
  HeatmapPalette,
  HeatmapVisualizationState,
} from './lens/visualizations/heatmap/lens_types';
export type {
  LegacyMetricLabelPositionType,
  LegacyMetricStyle,
  LegacyMetricLabelsConfig,
  LegacyMetricAlignment,
  LegacyMetricArguments,
} from './lens/visualizations/legacy_metric/expression_types';
export type { LegacyMetricState } from './lens/visualizations/legacy_metric/lens_types';
export type {
  AvailableMetricIcon,
  MetricTrendlineResult,
  MetricArguments,
  MetricTrendlineArguments,
} from './lens/visualizations/metric/expression_types';
export type {
  ValueFontMode,
  SecondaryTrendType,
  SecondaryTrend,
  MetricVisualizationState,
  MetricVisualizationStateOptionals,
} from './lens/visualizations/metric/lens_types';
export type {
  PartitionChartType,
  EmptySizeRadius,
  LabelPositions,
  ValueFormats,
  PartitionLegendValue,
  PartitionLabelsArguments,
} from './lens/visualizations/partition/expression_types';
export type {
  SharedPartitionLayerState,
  LensPartitionLayerState,
  LensPartitionVisualizationState,
} from './lens/visualizations/partition/lens_types';
export type { ExpressionTagCloudCommonParams } from './lens/visualizations/tagcloud/expression_types';
export type {
  LensTagcloudState,
  LensTagcloudConfig,
} from './lens/visualizations/tagcloud/lens_types';
export * from './lens/visualizations/xy/expression_types';
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
} from './lens/visualizations/xy/lens_types';
export { defaultSeriesType } from './lens/visualizations/xy/lens_types';

/**
 * Constants are used by both the expression language and the lens code
 */
export { ROW_HEIGHT_MODE } from './lens/constants';
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
