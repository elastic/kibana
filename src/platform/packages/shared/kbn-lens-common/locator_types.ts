/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedQuery } from '@kbn/data-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { Filter, AggregateQuery, Query, ProjectRouting } from '@kbn/es-query';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Reference } from '@kbn/content-management-utils';
import type { DateRange } from './types';

export const LENS_SHARE_STATE_ACTION = 'LENS_SHARE_STATE_ACTION';

export interface LensShareableState {
  /**
   * Optionally apply filters.
   */
  filters?: Filter[];

  /**
   * Optionally set a query.
   */
  query?: Query | AggregateQuery;

  /**
   * Optionally set the date range in the date picker.
   */
  resolvedDateRange?: DateRange & SerializableRecord;

  /**
   * Optionally set the id of the used saved query
   */
  savedQuery?: SavedQuery & SerializableRecord;

  /**
   * Set the visualization configuration
   */
  visualization: { activeId: string | null; state: unknown } & SerializableRecord;

  /**
   * Set the active datasource used
   */
  activeDatasourceId?: string;

  /**
   * Set the datasources configurations
   */
  datasourceStates: Record<string, unknown> & SerializableRecord;

  /**
   * Background search session id
   */
  searchSessionId?: string;

  /**
   * Set the references used in the Lens state
   */
  references: Array<Reference & SerializableRecord>;

  /**
   * Pass adHoc dataViews specs used in the Lens state
   */
  dataViewSpecs?: DataViewSpec[];
  projectRouting?: ProjectRouting;
}

export interface LensAppLocatorParams extends SerializableRecord {
  /**
   * Optionally set saved object ID.
   */
  savedObjectId?: string;

  /**
   * Background search session id
   */
  searchSessionId?: string;

  /**
   * Optionally apply filters.
   */
  filters?: Filter[];

  /**
   * Optionally set a query.
   */
  query?: Query | AggregateQuery;

  /**
   * Optionally set the date range in the date picker.
   */
  resolvedDateRange?: DateRange & SerializableRecord;

  /**
   * Optionally set the id of the used saved query
   */
  savedQuery?: SavedQuery & SerializableRecord;

  /**
   * In case of no savedObjectId passed, the properties above have to be passed
   */

  /**
   * Set the active datasource used
   */
  activeDatasourceId?: string | null;

  /**
   * Set the visualization configuration
   */
  visualization?: { activeId: string | null; state: unknown } & SerializableRecord;

  /**
   * Set the datasources configurations
   */
  datasourceStates?: Record<string, { state: unknown }> & SerializableRecord;

  /**
   * Set the references used in the Lens state
   */
  references?: Array<Reference & SerializableRecord>;

  /**
   * Pass adHoc dataViews specs used in the Lens state
   */
  dataViewSpecs?: DataViewSpec[];
}

export type LensAppLocator = LocatorPublic<LensAppLocatorParams>;

/**
 * Location state of scoped history (history instance of Kibana Platform application service)
 */
export interface MainHistoryLocationState {
  type: typeof LENS_SHARE_STATE_ACTION;
  payload:
    | LensShareableState
    | Omit<
        LensShareableState,
        'activeDatasourceId' | 'visualization' | 'datasourceStates' | 'references'
      >;
}
