/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

/*
 * These types are used to define the shape of the response from the saved query API
 * separate but similar to other types to draw attention to REST api return changes
 */

interface MatchAllFilterMetaRestResponse extends FilterMetaRestResponse, SerializableRecord {
  field: string;
  formattedValue: string;
}

type PhrasesFilterMetaRestResponse = FilterMetaRestResponse & {
  params: PhraseFilterValue[]; // The unformatted values
  field?: string;
};

interface RangeFilterParamsRestResponse extends SerializableRecord {
  from?: number | string;
  to?: number | string;
  gt?: number | string;
  lt?: number | string;
  gte?: number | string;
  lte?: number | string;
  format?: string;
}

type RangeFilterMetaRestResponse = FilterMetaRestResponse & {
  params?: RangeFilterParamsRestResponse;
  field?: string;
  formattedValue?: string;
  type: 'range';
};

type PhraseFilterValue = string | number | boolean;

interface PhraseFilterMetaParamsRestResponse extends SerializableRecord {
  query: PhraseFilterValue; // The unformatted value
}

type PhraseFilterMetaRestResponse = FilterMetaRestResponse & {
  params?: PhraseFilterMetaParamsRestResponse;
  field?: string;
  index?: string;
};

type FilterMetaParamsRestResponse =
  | FilterRestResponse
  | FilterRestResponse[]
  | RangeFilterMetaRestResponse
  | RangeFilterParamsRestResponse
  | PhraseFilterMetaRestResponse
  | PhraseFilterMetaParamsRestResponse
  | PhrasesFilterMetaRestResponse
  | MatchAllFilterMetaRestResponse
  | string
  | string[]
  | boolean
  | boolean[]
  | number
  | number[];

interface QueryRestResponse {
  query: string | { [key: string]: any };
  language: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type FilterMetaRestResponse = {
  alias?: string | null;
  disabled?: boolean;
  negate?: boolean;
  // controlledBy is there to identify who owns the filter
  controlledBy?: string;
  // allows grouping of filters
  group?: string;
  // index and type are optional only because when you create a new filter, there are no defaults
  index?: string;
  isMultiIndex?: boolean;
  type?: string;
  key?: string;
  params?: FilterMetaParamsRestResponse;
  value?: string;
};

type FilterStateStoreRestResponse = 'appState' | 'globalState';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type FilterRestResponse = {
  $state?: {
    store: FilterStateStoreRestResponse;
  };
  meta: FilterMetaRestResponse;
  query?: Record<string, any>;
};

interface RefreshIntervalRestResponse {
  pause: boolean;
  value: number;
}

interface TimeRangeRestResponse {
  from: string;
  to: string;
  mode?: 'absolute' | 'relative';
}

type SavedQueryTimeFilterRestResponse = TimeRangeRestResponse & {
  refreshInterval: RefreshIntervalRestResponse;
};

export interface SavedQueryRestResponse {
  id: string;
  attributes: {
    filters?: FilterRestResponse[];
    title: string;
    description: string;
    query: QueryRestResponse;
    timefilter?: SavedQueryTimeFilterRestResponse | undefined;
  };
}
