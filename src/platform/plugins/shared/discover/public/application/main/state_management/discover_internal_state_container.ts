/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import {
  createStateContainer,
  createStateContainerReactHelpers,
  ReduxLikeStateContainer,
} from '@kbn/kibana-utils-plugin/common';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram-plugin/public';

interface InternalStateDataRequestParams {
  timeRangeAbsolute?: TimeRange;
  timeRangeRelative?: TimeRange;
}

export interface InternalState {
  expandedDoc: DataTableRecord | undefined;
  customFilters: Filter[];
  overriddenVisContextAfterInvalidation: UnifiedHistogramVisContext | {} | undefined; // it will be used during saved search saving
  isESQLToDataViewTransitionModalVisible?: boolean;
  resetDefaultProfileState: {
    resetId: string;
    columns: boolean;
    rowHeight: boolean;
    breakdownField: boolean;
  };
  dataRequestParams: InternalStateDataRequestParams;
}

export interface InternalStateTransitions {
  setExpandedDoc: (
    state: InternalState
  ) => (dataView: DataTableRecord | undefined) => InternalState;
  setCustomFilters: (state: InternalState) => (customFilters: Filter[]) => InternalState;
  setOverriddenVisContextAfterInvalidation: (
    state: InternalState
  ) => (
    overriddenVisContextAfterInvalidation: UnifiedHistogramVisContext | {} | undefined
  ) => InternalState;
  resetOnSavedSearchChange: (state: InternalState) => () => InternalState;
  setIsESQLToDataViewTransitionModalVisible: (
    state: InternalState
  ) => (isVisible: boolean) => InternalState;
  setResetDefaultProfileState: (
    state: InternalState
  ) => (
    resetDefaultProfileState: Omit<InternalState['resetDefaultProfileState'], 'resetId'>
  ) => InternalState;
  setDataRequestParams: (
    state: InternalState
  ) => (params: InternalStateDataRequestParams) => InternalState;
}

export type DiscoverInternalStateContainer = ReduxLikeStateContainer<
  InternalState,
  InternalStateTransitions
>;

export const { Provider: InternalStateProvider, useSelector: useInternalStateSelector } =
  createStateContainerReactHelpers<ReduxLikeStateContainer<InternalState>>();

export function getInternalStateContainer() {
  return createStateContainer<InternalState, InternalStateTransitions, {}>(
    {
      expandedDoc: undefined,
      customFilters: [],
      overriddenVisContextAfterInvalidation: undefined,
      resetDefaultProfileState: {
        resetId: '',
        columns: false,
        rowHeight: false,
        breakdownField: false,
      },
      dataRequestParams: {},
    },
    {
      setIsESQLToDataViewTransitionModalVisible:
        (prevState: InternalState) => (isVisible: boolean) => ({
          ...prevState,
          isESQLToDataViewTransitionModalVisible: isVisible,
        }),
      setExpandedDoc: (prevState: InternalState) => (expandedDoc: DataTableRecord | undefined) => ({
        ...prevState,
        expandedDoc,
      }),
      setCustomFilters: (prevState: InternalState) => (customFilters: Filter[]) => ({
        ...prevState,
        customFilters,
      }),
      setOverriddenVisContextAfterInvalidation:
        (prevState: InternalState) =>
        (overriddenVisContextAfterInvalidation: UnifiedHistogramVisContext | {} | undefined) => ({
          ...prevState,
          overriddenVisContextAfterInvalidation,
        }),
      resetOnSavedSearchChange: (prevState: InternalState) => () => ({
        ...prevState,
        overriddenVisContextAfterInvalidation: undefined,
        expandedDoc: undefined,
      }),
      setDataRequestParams:
        (prevState: InternalState) => (params: InternalStateDataRequestParams) => ({
          ...prevState,
          dataRequestParams: params,
        }),
      setResetDefaultProfileState:
        (prevState: InternalState) =>
        (resetDefaultProfileState: Omit<InternalState['resetDefaultProfileState'], 'resetId'>) => ({
          ...prevState,
          resetDefaultProfileState: {
            ...resetDefaultProfileState,
            resetId: uuidv4(),
          },
        }),
    },
    {},
    { freeze: (state) => state }
  );
}
