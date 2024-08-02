/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import { type UiCounterMetricType } from '@kbn/analytics';
import type { Filter, Query, AggregateQuery, TimeRange } from '@kbn/es-query';
import type {
  PublishesBlockingError,
  PublishesDataLoading,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { type BehaviorSubject } from 'rxjs';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { AdditionalFieldGroups } from '@kbn/unified-field-list';
import type { DiscoverStateContainer } from '../../state_management/discover_state';

export interface RandomSamplingOption {
  mode: 'random_sampling';
  seed: string;
  probability: number;
}

export interface NormalSamplingOption {
  mode: 'normal_sampling';
  seed: string;
  shardSize: number;
}

export interface NoSamplingOption {
  mode: 'no_sampling';
  seed: string;
}

export type SamplingOption = RandomSamplingOption | NormalSamplingOption | NoSamplingOption;

export interface FieldStatisticsTableEmbeddableState extends SerializedTitles {
  /**
   * Data view is required for esql:false or non-ESQL mode
   */
  dataView?: DataView;
  /**
   * Kibana saved search object
   */
  savedSearch?: SavedSearch;
  /**
   * Kibana query
   */
  query?: Query | AggregateQuery;
  /**
   * List of fields to visibile show in the table
   * set shouldGetSubfields: true if table needs to show the sub multi-field like .keyword
   */
  visibleFieldNames?: string[];
  /**
   * List of filters
   */
  filters?: Filter[];
  /**
   * Whether to show the preview/mini distribution chart on the tables upon first table mounting
   */
  showPreviewByDefault?: boolean;
  /**
   * If true, will show a button action to edit the data view field in every row
   */
  allowEditDataView?: boolean;
  /**
   * Optional id to identify the embeddable
   */
  id?: string;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  /**
   * Optional search sessionId to save and restore long running search
   * If not provided, will generate its own sessionId
   */
  sessionId?: string;
  /**
   * Optional list of fields provided to table to fetch a subset of fields only
   * so it doesn't need to fetch all fields
   */
  fieldsToFetch?: string[];
  /**
   * Total documents optionally provided to help table have context of the fetch size
   * so it can reduce redundant API requests
   */
  totalDocuments?: number;
  /**
   * For non-ESQL mode, the sampling option is used to determine the sampling strategy
   */
  samplingOption?: SamplingOption;
  /**
   * If esql:true, switch table to ES|QL mode
   */
  esql?: boolean;
  /**
   * If esql:true, the index pattern is used to validate time field
   */
  indexPattern?: string;
  /**
   * If true, the table will try to retrieve subfield information as well based on visibleFields
   * For example: visibleFields: ['field1', 'field2'] => will show ['field1', 'field1.keyword', 'field2', 'field2.keyword']
   */
  shouldGetSubfields?: boolean;
  /**
   * Force refresh the table
   */
  lastReloadRequestTime?: number;
}
interface FieldStatisticsTableEmbeddableComponentApi {
  showDistributions$?: BehaviorSubject<boolean>;
}

export type FieldStatisticsTableEmbeddableApi =
  DefaultEmbeddableApi<FieldStatisticsTableEmbeddableState> &
    FieldStatisticsTableEmbeddableComponentApi &
    PublishesDataLoading &
    PublishesBlockingError;

export interface FieldStatisticsTableProps {
  /**
   * Determines which columns are displayed
   */
  columns: string[];
  /**
   * The used data view
   */
  dataView: DataView;
  /**
   * Saved search description
   */
  searchDescription?: string;
  /**
   * Saved search title
   */
  searchTitle?: string;
  /**
   * Optional saved search
   */
  savedSearch?: SavedSearch;
  /**
   * Optional query to update the table content
   */
  query?: Query | AggregateQuery;
  /**
   * Filters query to update the table content
   */
  filters?: Filter[];
  /**
   * State container with persisted settings
   */
  stateContainer?: DiscoverStateContainer;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  /**
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  /**
   * Search session id to save to or restore from
   */
  searchSessionId?: string;
  /**
   * Additional field groups (e.g. Smart Fields)
   */
  additionalFieldGroups?: AdditionalFieldGroups;
  /**
   * If table should query using ES|QL
   */
  isEsqlMode?: boolean;
  /**
   * Time range
   */
  timeRange?: TimeRange;
}
