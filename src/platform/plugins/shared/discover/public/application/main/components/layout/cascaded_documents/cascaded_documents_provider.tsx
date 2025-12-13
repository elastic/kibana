/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType, type AggregateQuery, type TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { ReactElement } from 'react';
import { createContext, useContext } from 'react';
import type { RequestAdapter } from '@kbn/inspector-plugin/public';
import type {
  CascadedDocumentsState,
  DiscoverAppState,
  internalStateActions,
} from '../../../state_management/redux';
import type { DiscoverStateContainer } from '../../../state_management/discover_state';

export interface CascadedDocumentsContext {
  cascadedDocumentsState: CascadedDocumentsState;
  esqlQuery: AggregateQuery;
  esqlVariables: ESQLControlVariable[] | undefined;
  timeRange: TimeRange | undefined;
  viewModeToggle: ReactElement | undefined;
  cascadeGroupingChangeHandler: (cascadeGrouping: string[]) => void;
  onUpdateESQLQuery: DiscoverStateContainer['actions']['updateESQLQuery'];
  openInNewTab: (...args: Parameters<typeof internalStateActions.openInNewTab>) => void;
  registerCascadeRequestsInspectorAdapter: (requestAdapter: RequestAdapter) => void;
}

const cascadedDocumentsContext = createContext<CascadedDocumentsContext | undefined>(undefined);

export const CascadedDocumentsProvider = cascadedDocumentsContext.Provider;

const SUPPORTED_CASCADE_GROUPING_COUNT = 1;

export const isCascadedDocumentsVisible = (
  cascadedDocumentsState: CascadedDocumentsState | undefined,
  query: DiscoverAppState['query']
): cascadedDocumentsState is CascadedDocumentsState => {
  const isEsqlQuery = isOfAggregateQueryType(query);
  const isValidState = Boolean(
    cascadedDocumentsState &&
      cascadedDocumentsState.availableCascadeGroups.length > 0 &&
      cascadedDocumentsState.availableCascadeGroups.length <= SUPPORTED_CASCADE_GROUPING_COUNT
  );

  return isEsqlQuery && isValidState;
};

export const useMaybeCascadedDocumentsContext = () => {
  const context = useContext(cascadedDocumentsContext);

  if (isCascadedDocumentsVisible(context?.cascadedDocumentsState, context?.esqlQuery)) {
    return context;
  }
};

export const useCascadedDocumentsContext = () => {
  const context = useContext(cascadedDocumentsContext);

  if (!isCascadedDocumentsVisible(context?.cascadedDocumentsState, context?.esqlQuery)) {
    throw new Error(
      'useCascadedDocumentsContext must be used with a valid CascadedDocumentsContext'
    );
  }

  return context;
};
