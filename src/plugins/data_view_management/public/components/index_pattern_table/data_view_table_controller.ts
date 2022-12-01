/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { BehaviorSubject, Observable } from 'rxjs';
import { getIndexPatterns } from '../utils';
import { IndexPatternTableItem } from '../types';

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

export class DataViewTableController {
  constructor({
    services: { dataViews },
    config: { defaultDataView },
  }: DataViewTableControllerConstructorArgs) {
    this.dataViews = dataViews;
    this.defaultDataView = defaultDataView;

    this.state$ = this.stateInternal$.asObservable();

    this.loadDataViews();
  }

  private state: DataViewTableControllerState = {
    isLoadingDataViews: false,
    isLoadingHasData: true,
    hasDataView: false,
    hasEsData: false,
    dataViews: [],
  };

  private stateInternal$ = new BehaviorSubject<DataViewTableControllerState>(this.state);
  state$: Observable<DataViewTableControllerState>;

  private dataViews: DataViewsPublicPluginStart;
  private defaultDataView: string;

  private updateState = (newState: Partial<DataViewTableControllerState>) => {
    this.state = { ...this.state, ...newState };
    this.stateInternal$.next(this.state);
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
