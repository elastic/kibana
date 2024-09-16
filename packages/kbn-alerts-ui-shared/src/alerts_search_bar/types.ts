/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { ToastsStart, HttpStart } from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';

export type QueryLanguageType = 'lucene' | 'kuery';

export interface AlertsSearchBarProps {
  appName: string;
  disableQueryLanguageSwitcher?: boolean;
  ruleTypeIds: string[];
  rangeFrom?: string;
  rangeTo?: string;
  query?: string;
  filters?: Filter[];
  showFilterBar?: boolean;
  showDatePicker?: boolean;
  showSubmitButton?: boolean;
  placeholder?: string;
  submitOnBlur?: boolean;
  ruleTypeId?: string;
  onQueryChange?: (query: {
    dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
    query?: string;
  }) => void;
  onQuerySubmit: (query: {
    dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
    query?: string;
  }) => void;
  onFiltersUpdated?: (filters: Filter[]) => void;
  http: HttpStart;
  toasts: ToastsStart;
  unifiedSearchBar: UnifiedSearchPublicPluginStart['ui']['SearchBar'];
  dataViewsService: DataViewsContract;
}
