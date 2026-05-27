/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ValueSuggestionsMethod } from '@kbn/data-plugin/common';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { TimefilterSetup } from '@kbn/data-plugin/public';
import type { AutocompleteUsageCollector } from '../collectors';
export type ValueSuggestionsGetFn = (args: ValueSuggestionsGetFnArgs) => Promise<any[]>;
interface ValueSuggestionsGetFnArgs {
  indexPattern: DataView;
  field: DataViewField;
  query: string;
  useTimeRange?: boolean;
  boolFilter?: any[];
  signal?: AbortSignal;
  method?: ValueSuggestionsMethod;
  querySuggestionKey?: 'rules' | 'cases' | 'alerts' | 'endpoints' | 'action_policies';
}
export declare const getEmptyValueSuggestions: ValueSuggestionsGetFn;
export declare const setupValueSuggestionProvider: (
  core: CoreSetup,
  {
    timefilter,
    usageCollector,
  }: {
    timefilter: TimefilterSetup;
    usageCollector?: AutocompleteUsageCollector;
  }
) => ValueSuggestionsGetFn;
export {};
