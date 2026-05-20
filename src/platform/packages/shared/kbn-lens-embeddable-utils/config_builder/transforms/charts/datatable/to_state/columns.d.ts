import type { ColumnState } from '@kbn/lens-common';
import type { DatatableConfig } from '../../../../schema';
export declare function buildMetricsState(metrics: DatatableConfig['metrics']): ColumnState[];
export declare function buildRowsState(rows: DatatableConfig['rows']): ColumnState[];
export declare function buildSplitMetricsByState(splitMetrics: DatatableConfig['split_metrics_by']): ColumnState[];
