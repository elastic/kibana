/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import type { Pagination } from '@elastic/eui';
import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';

export interface GetExceptionItemProps {
  pagination?: Pagination;
  search?: string;
  filters?: string;
}

export interface PaginationProps {
  dataTestSubj?: string;
  ariaLabel?: string;
  pagination: Pagination;
  onPaginationChange: (arg: GetExceptionItemProps) => void;
}

export enum ViewerStatus {
  ERROR = 'error',
  EMPTY = 'empty',
  EMPTY_SEARCH = 'empty_search',
  LOADING = 'loading',
  SEARCHING = 'searching',
  DELETING = 'deleting',
}

export interface ExceptionListSummaryProps {
  pagination: Pagination;
  // Corresponds to last time exception items were fetched
  lastUpdated: string | number | null;
}

export type ViewerFlyoutName = 'addException' | 'editException' | null;

export interface RuleReferences {
  [key: string]: any[]; // TODO fix
}

export interface ExceptionListItemIdentifiers {
  id: string;
  name: string;
  namespaceType: NamespaceType;
}

export enum ListTypeText {
  ENDPOINT = 'endpoint',
  DETECTION = 'empty',
  RULE_DEFAULT = 'empty_search',
}

export interface RuleReference {
  name: string;
  id: string;
  ruleId: string;
  exceptionLists: ExceptionListSchema[];
}
