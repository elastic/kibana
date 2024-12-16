/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { PublishingSubject } from '@kbn/presentation-publishing';
import { UnifiedHistogramFetchStatus } from '../..';
import type { UnifiedHistogramServices, UnifiedHistogramChartLoadEvent } from '../../types';
import {
  getChartHidden,
  getTopPanelHeight,
  setChartHidden,
  setTopPanelHeight,
} from '../utils/local_storage_utils';
import type { UnifiedHistogramSuggestionContext } from '../../types';

/**
 * The current state of the container
 */
export interface UnifiedHistogramState {
  /**
   * The current Lens suggestion
   */
  currentSuggestionContext: UnifiedHistogramSuggestionContext | undefined;
  /**
   * Whether or not the chart is hidden
   */
  chartHidden: boolean;
  /**
   * The current Lens request adapter
   */
  lensRequestAdapter: RequestAdapter | undefined;
  /**
   * The current Lens adapters
   */
  lensAdapters?: UnifiedHistogramChartLoadEvent['adapters'];
  /**
   * Lens embeddable output observable
   */
  dataLoading$?: PublishingSubject<boolean | undefined>;
  /**
   * The current time interval of the chart
   */
  timeInterval: string;
  /**
   * The current top panel height
   */
  topPanelHeight: number | undefined;
  /**
   * The current fetch status of the hits count request
   */
  totalHitsStatus: UnifiedHistogramFetchStatus;
  /**
   * The current result of the hits count request
   */
  totalHitsResult: number | Error | undefined;
}

/**
 * The options used to initialize the comntainer state
 */
export interface UnifiedHistogramStateOptions {
  /**
   * The services required by the Unified Histogram components
   */
  services: UnifiedHistogramServices;
  /**
   * The prefix for the keys used in local storage -- leave undefined to avoid using local storage
   */
  localStorageKeyPrefix?: string;
  /**
   * The initial state of the container
   */
  initialState?: Partial<UnifiedHistogramState>;
}

/**
 * The service used to manage the state of the container
 */
export interface UnifiedHistogramStateService {
  /**
   * The current state of the container
   */
  state$: Observable<UnifiedHistogramState>;
  /**
   * Sets the current chart hidden state
   */
  setChartHidden: (chartHidden: boolean) => void;
  /**
   * Sets current Lens suggestion
   */
  setCurrentSuggestionContext: (
    suggestionContext: UnifiedHistogramSuggestionContext | undefined
  ) => void;
  /**
   * Sets the current top panel height
   */
  setTopPanelHeight: (topPanelHeight: number | undefined) => void;
  /**
   * Sets the current time interval
   */
  setTimeInterval: (timeInterval: string) => void;
  /**
   * Sets the current Lens request adapter
   */
  setLensRequestAdapter: (lensRequestAdapter: RequestAdapter | undefined) => void;
  /**
   * Sets the current Lens adapters
   */
  setLensAdapters: (lensAdapters: UnifiedHistogramChartLoadEvent['adapters'] | undefined) => void;
  setLensDataLoading$: (dataLoading$: PublishingSubject<boolean | undefined> | undefined) => void;
  /**
   * Sets the current total hits status and result
   */
  setTotalHits: (totalHits: {
    totalHitsStatus: UnifiedHistogramFetchStatus;
    totalHitsResult: number | Error | undefined;
  }) => void;
}

export const createStateService = (
  options: UnifiedHistogramStateOptions
): UnifiedHistogramStateService => {
  const { services, localStorageKeyPrefix, initialState } = options;

  let initialChartHidden = false;
  let initialTopPanelHeight: number | undefined;

  if (localStorageKeyPrefix) {
    initialChartHidden = getChartHidden(services.storage, localStorageKeyPrefix) ?? false;
    initialTopPanelHeight = getTopPanelHeight(services.storage, localStorageKeyPrefix);
  }

  const state$ = new BehaviorSubject<UnifiedHistogramState>({
    chartHidden: initialChartHidden,
    currentSuggestionContext: undefined,
    lensRequestAdapter: undefined,
    timeInterval: 'auto',
    topPanelHeight: initialTopPanelHeight,
    totalHitsResult: undefined,
    totalHitsStatus: UnifiedHistogramFetchStatus.uninitialized,
    ...initialState,
  });

  const updateState = (stateUpdate: Partial<UnifiedHistogramState>) => {
    state$.next({
      ...state$.getValue(),
      ...stateUpdate,
    });
  };

  return {
    state$,

    setChartHidden: (chartHidden: boolean) => {
      if (localStorageKeyPrefix) {
        setChartHidden(services.storage, localStorageKeyPrefix, chartHidden);
      }

      updateState({ chartHidden });
    },

    setTopPanelHeight: (topPanelHeight: number | undefined) => {
      if (localStorageKeyPrefix) {
        setTopPanelHeight(services.storage, localStorageKeyPrefix, topPanelHeight);
      }

      updateState({ topPanelHeight });
    },

    setCurrentSuggestionContext: (
      suggestionContext: UnifiedHistogramSuggestionContext | undefined
    ) => {
      updateState({ currentSuggestionContext: suggestionContext });
    },

    setTimeInterval: (timeInterval: string) => {
      updateState({ timeInterval });
    },

    setLensRequestAdapter: (lensRequestAdapter: RequestAdapter | undefined) => {
      updateState({ lensRequestAdapter });
    },

    setLensAdapters: (lensAdapters: UnifiedHistogramChartLoadEvent['adapters'] | undefined) => {
      updateState({ lensAdapters });
    },
    setLensDataLoading$: (dataLoading$: PublishingSubject<boolean | undefined> | undefined) => {
      updateState({ dataLoading$ });
    },

    setTotalHits: (totalHits: {
      totalHitsStatus: UnifiedHistogramFetchStatus;
      totalHitsResult: number | Error | undefined;
    }) => {
      updateState(totalHits);
    },
  };
};
