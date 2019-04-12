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

import { SearchSource } from '../../courier';
import { PersistedState } from '../../persisted_state';
import { AppState } from '../../state_management/app_state';
import { Vis } from '../../vis';
import { SavedObject } from 'ui/saved_objects/saved_object';

export interface TimeRange {
  from: string;
  to: string;
}

export interface FilterMeta {
  disabled: boolean;
}

export interface Filter {
  meta: FilterMeta;
  query: object;
}

export type Filters = Filter[];

export enum QueryLanguageType {
  KUERY = 'kuery',
  LUCENE = 'lucene',
}

export interface Query {
  language: QueryLanguageType;
  query: string;
}

export interface VisSavedObject extends SavedObject {
  vis: Vis;
  description?: string;
  searchSource: SearchSource;
  title: string;
  uiStateJSON?: string;
  destroy: () => void;
  id: string;
}

interface VisResponseValue {
  visType: string;
  visData: object;
  visConfig: object;
  params?: object;
}

export interface VisResponseData {
  as: string;
  value: VisResponseValue;
}

/**
 * The parameters accepted by the embedVisualize calls.
 */
export interface VisualizeLoaderParams {
  /**
   * An object with a from/to key, that must be either a date in ISO format, or a
   * valid datetime Elasticsearch expression, e.g.: { from: 'now-7d/d', to: 'now' }
   */
  timeRange?: TimeRange;
  /**
   * If set to true, the visualization will be appended to the passed element instead
   * of replacing all its content. (default: false)
   */
  append?: boolean;
  /**
   * If specified this CSS class (or classes with space separated) will be set to
   * the root visualize element.
   */
  cssClass?: string;
  /**
   * An object of key-value pairs, that will be set as data-{key}="{value}" attributes
   * on the visualization element.
   */
  dataAttrs?: { [key: string]: string };
  /**
   * Specifies the filters that should be applied to that visualization.
   */
  filters?: Filters;
  /**
   * The query that should apply to that visualization.
   */
  query?: Query;
  /**
   * The current uiState of the application. If you don't pass a uiState, the
   * visualization will creates it's own uiState to store information like whether
   * the legend is open or closed, but you don't have access to it from the outside.
   * Pass one in if you need that access, e.g. for saving that state.
   */
  uiState?: PersistedState;
  /**
   * The appState this visualization should use. If you don't specify it, the
   * global AppState (that is decoded in the URL) will be used. Usually you don't
   * need to overwrite this, unless you don't want the visualization to use the
   * global AppState.
   */
  appState?: AppState;
  /**
   * Whether or not the visualization should fetch its data automatically. If this is
   * set to `false` the loader won't trigger a fetch on embedding or when an auto refresh
   * cycle happens. Default value: `true`
   */
  autoFetch?: boolean;
}

/**
 * The subset of properties allowed to update on an already embedded visualization.
 */
export type VisualizeUpdateParams = Pick<
  VisualizeLoaderParams,
  'timeRange' | 'dataAttrs' | 'filters' | 'query'
>;
