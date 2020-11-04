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

import { SerializableState } from '../../kibana_utils/common';
import { Query, TimeRange } from '../../data/common/query';
import { Filter } from '../../data/common/es_query/filters';

export enum ViewMode {
  EDIT = 'edit',
  VIEW = 'view',
}

export type EmbeddableInput = {
  viewMode?: ViewMode;
  title?: string;
  /**
   * Note this is not a saved object id. It is used to uniquely identify this
   * Embeddable instance from others (e.g. inside a container).  It's possible to
   * have two Embeddables where everything else is the same but the id.
   */
  id: string;
  lastReloadRequestTime?: number;
  hidePanelTitles?: boolean;

  /**
   * Reserved key for enhancements added by other plugins.
   */
  enhancements?: SerializableState;

  /**
   * List of action IDs that this embeddable should not render.
   */
  disabledActions?: string[];

  /**
   * Whether this embeddable should not execute triggers.
   */
  disableTriggers?: boolean;

  /**
   * Time range of the chart.
   */
  timeRange?: TimeRange;

  /**
   * Visualization query string used to narrow down results.
   */
  query?: Query;

  /**
   * Visualization filters used to narrow down results.
   */
  filters?: Filter[];

  /**
   * Search session id to group searches
   */
  searchSessionId?: string;
};

export type EmbeddableStateWithType = EmbeddableInput & { type: string };

export interface CommonEmbeddableStartContract {
  getEmbeddableFactory: (embeddableFactoryId: string) => any;
  getEnhancement: (enhancementId: string) => any;
}
