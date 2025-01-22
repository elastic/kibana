/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { BehaviorSubject, Observable } from 'rxjs';
import { isEqual } from 'lodash';
import { getIndexPatterns } from '../utils';
import { IndexPatternTableItem } from '../types';
import { stateSelectorFactory } from '../state_helpers';

export interface DataViewTableControllerState {
  isLoadingDataViews: boolean;
  isLoadingHasData: boolean;
  hasDataView: boolean;
  hasEsData: boolean;
  dataViews: IndexPatternTableItem[];
}

export interface DataViewTableControllerConstructorArgs {
  services: {
    dataViews: DataViewsPublicPluginStart;
  };
  config: {
    defaultDataView: string;
  };
}

export const dataViewTableControllerStateDefaults = {
  isLoadingDataViews: false,
  isLoadingHasData: true,
  hasDataView: false,
  hasEsData: false,
  dataViews: [],
};

const selectIndexPattern = (state: DataViewTableControllerState) => state.dataViews;
const selectHasDataView = (state: DataViewTableControllerState) => state.hasDataView;
const selectHasEsData = (state: DataViewTableControllerState) => state.hasEsData;
const selectIsLoadingIndexPatterns = (state: DataViewTableControllerState) =>
  state.isLoadingDataViews;
const selectIsLoadingDataState = (state: DataViewTableControllerState) => state.isLoadingHasData;

export class DataViewTableController {
  constructor({
    services: { dataViews },
    config: { defaultDataView },
  }: DataViewTableControllerConstructorArgs) {
    this.dataViews = dataViews;
    this.defaultDataView = defaultDataView;

    const stateSelector = stateSelectorFactory(this.state$);

    this.isLoadingIndexPatterns$ = stateSelector(selectIsLoadingIndexPatterns);
    this.indexPatterns$ = stateSelector(selectIndexPattern, isEqual);
    this.isLoadingDataState$ = stateSelector(selectIsLoadingDataState);
    this.hasDataView$ = stateSelector(selectHasDataView);
    this.hasESData$ = stateSelector(selectHasEsData);

    this.loadDataViews();
  }

  private state: DataViewTableControllerState = {
    ...dataViewTableControllerStateDefaults,
  };

  private state$ = new BehaviorSubject<DataViewTableControllerState>(this.state);

  private dataViews: DataViewsPublicPluginStart;
  private defaultDataView: string;

  isLoadingIndexPatterns$: Observable<boolean>;
  indexPatterns$: Observable<IndexPatternTableItem[]>;
  isLoadingDataState$: Observable<boolean>;
  hasDataView$: Observable<boolean>;
  hasESData$: Observable<boolean>;

  private updateState = (newState: Partial<DataViewTableControllerState>) => {
    this.state = { ...this.state, ...newState };
    this.state$.next(this.state);
  };

  private loadHasData = async () => {
    const hasDataViewPromise = this.dataViews.hasData.hasDataView().then((hasDataView) => {
      this.updateState({ hasDataView });
    });

    const hasESDataPromise = this.dataViews.hasData.hasESData().then((hasEsData) => {
      this.updateState({ hasEsData });
    });

    return Promise.all([hasDataViewPromise, hasESDataPromise]).then(() => {
      this.updateState({ isLoadingHasData: false });
    });
  };

  private getDataViews = async () => {
    this.updateState({ isLoadingDataViews: true });
    const dataViews = await getIndexPatterns(this.defaultDataView, this.dataViews);
    this.updateState({ dataViews, isLoadingDataViews: false });
  };

  loadDataViews = async () => {
    const loadHasDataPromise = this.loadHasData();
    const getDataViewsPromise = this.getDataViews();
    return Promise.all([loadHasDataPromise, getDataViewsPromise]);
  };
}
