/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';
import type { Suggestion } from './types';
declare const LENS_ITEM_LATEST_VERSION: 2;
interface LensAttributesFromSuggestion {
  references: Array<{
    name: string;
    id: string;
    type: string;
  }>;
  visualizationType: string;
  state: {
    visualization: {};
    datasourceStates: Record<string, unknown>;
    query?: Query;
    filters: Filter[];
    adHocDataViews?: Record<string, DataViewSpec>;
  };
  title: string;
  version: typeof LENS_ITEM_LATEST_VERSION;
}
export declare const getLensAttributesFromSuggestion: ({
  filters,
  query,
  suggestion,
  dataView,
}: {
  filters: Filter[];
  query: Query | AggregateQuery;
  suggestion: Suggestion | undefined;
  dataView?: DataView;
}) => LensAttributesFromSuggestion;
export {};
