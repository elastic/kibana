/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Filter,
  buildEsQuery,
  compareFilters,
  buildPhraseFilter,
  buildPhrasesFilter,
} from '@kbn/es-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { isEqual } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { merge, Subject, Subscription, BehaviorSubject } from 'rxjs';
import { tap, debounceTime, map, distinctUntilChanged, skip } from 'rxjs/operators';

import { OptionsListComponent, OptionsListComponentState } from './options_list_component';
import {
  withSuspense,
  LazyReduxEmbeddableWrapper,
  ReduxEmbeddableWrapperPropsWithChildren,
} from '../../../../presentation_util/public';
import { OptionsListEmbeddableInput, OPTIONS_LIST_CONTROL } from './types';
import { ControlsDataViewsService } from '../../services/data_views';
import { Embeddable, IContainer } from '../../../../embeddable/public';
import { ControlsDataService } from '../../services/data';
import { optionsListReducers } from './options_list_reducers';
import { OptionsListStrings } from './options_list_strings';
import { DataView } from '../../../../data_views/public';
import { ControlInput, ControlOutput } from '../..';
import { pluginServices } from '../../services';

const OptionsListReduxWrapper = withSuspense<
  ReduxEmbeddableWrapperPropsWithChildren<OptionsListEmbeddableInput>
>(LazyReduxEmbeddableWrapper);

const diffDataFetchProps = (
  current?: OptionsListDataFetchProps,
  last?: OptionsListDataFetchProps
) => {
  if (!current || !last) return false;
  const { filters: currentFilters, ...currentWithoutFilters } = current;
  const { filters: lastFilters, ...lastWithoutFilters } = last;
  if (!deepEqual(currentWithoutFilters, lastWithoutFilters)) return false;
  if (!compareFilters(lastFilters ?? [], currentFilters ?? [])) return false;
  return true;
};

interface OptionsListDataFetchProps {
  search?: string;
  fieldName: string;
  dataViewId: string;
  query?: ControlInput['query'];
  filters?: ControlInput['filters'];
}

const fieldMissingError = (fieldName: string) =>
  new Error(`field ${fieldName} not found in index pattern`);

export class OptionsListEmbeddable extends Embeddable<OptionsListEmbeddableInput, ControlOutput> {
  public readonly type = OPTIONS_LIST_CONTROL;
  public deferEmbeddableLoad = true;

  private subscriptions: Subscription = new Subscription();
  private node?: HTMLElement;

  // Controls services
  private dataService: ControlsDataService;
  private dataViewsService: ControlsDataViewsService;

  // Internal data fetching state for this input control.
  private typeaheadSubject: Subject<string> = new Subject<string>();
  private dataView?: DataView;
  private searchString = '';

  // State to be passed down to component
  private componentState: OptionsListComponentState;
  private componentStateSubject$ = new BehaviorSubject<OptionsListComponentState>({
    loading: true,
  });

  constructor(input: OptionsListEmbeddableInput, output: ControlOutput, parent?: IContainer) {
    super(input, output, parent); // get filters for initial output...

    // Destructure controls services
    ({ data: this.dataService, dataViews: this.dataViewsService } = pluginServices.getServices());

    this.componentState = { loading: true };
    this.updateComponentState(this.componentState);

    this.initialize();
  }

  private setupSubscriptions = () => {
    const dataFetchPipe = this.getInput$().pipe(
      map((newInput) => ({
        lastReloadRequestTime: newInput.lastReloadRequestTime,
        dataViewId: newInput.dataViewId,
        fieldName: newInput.fieldName,
        timeRange: newInput.timeRange,
        filters: newInput.filters,
        query: newInput.query,
      })),
      distinctUntilChanged(diffDataFetchProps)
    );

    // push searchString changes into a debounced typeahead subject
    this.typeaheadSubject = new Subject<string>();
    const typeaheadPipe = this.typeaheadSubject.pipe(
      tap((newSearchString) => (this.searchString = newSearchString)),
      debounceTime(100)
    );

    // fetch available options when input changes or when search string has changed
    this.subscriptions.add(
      merge(dataFetchPipe, typeaheadPipe).subscribe(this.fetchAvailableOptions)
    );

    // build filters when selectedOptions change
    this.subscriptions.add(
      this.getInput$()
        .pipe(
          debounceTime(400),
          distinctUntilChanged((a, b) => isEqual(a.selectedOptions, b.selectedOptions)),
          skip(1) // skip the first input update because initial filters will be built by initialize.
        )
        .subscribe(() => this.buildFilter())
    );
  };

  private getCurrentDataView = async (): Promise<DataView> => {
    const { dataViewId } = this.getInput();
    if (this.dataView && this.dataView.id === dataViewId) return this.dataView;
    this.dataView = await this.dataViewsService.get(dataViewId);
    if (this.dataView === undefined) {
      this.onFatalError(new Error(OptionsListStrings.errors.getDataViewNotFoundError(dataViewId)));
    }
    this.updateOutput({ dataViews: [this.dataView] });
    return this.dataView;
  };

  private updateComponentState(changes: Partial<OptionsListComponentState>) {
    this.componentState = {
      ...this.componentState,
      ...changes,
    };
    this.componentStateSubject$.next(this.componentState);
  }

  private fetchAvailableOptions = async () => {
    this.updateComponentState({ loading: true });
    const { ignoreParentSettings, filters, fieldName, query } = this.getInput();
    const dataView = await this.getCurrentDataView();
    const field = dataView.getFieldByName(fieldName);

    if (!field) throw fieldMissingError(fieldName);

    const boolFilter = [
      buildEsQuery(
        dataView,
        ignoreParentSettings?.ignoreQuery ? [] : query ?? [],
        ignoreParentSettings?.ignoreFilters ? [] : filters ?? []
      ),
    ];

    // TODO Switch between `terms_agg` and `terms_enum` method depending on the value of ignoreParentSettings
    // const method = Object.values(ignoreParentSettings || {}).includes(false) ?

    const newOptions = await this.dataService.autocomplete.getValueSuggestions({
      query: this.searchString,
      indexPattern: dataView,
      useTimeRange: !ignoreParentSettings?.ignoreTimerange,
      method: 'terms_agg', // terms_agg method is required to use timeRange
      boolFilter,
      field,
    });
    this.updateComponentState({ availableOptions: newOptions, loading: false });
  };

  private initialize = async () => {
    const initialSelectedOptions = this.getInput().selectedOptions;
    if (initialSelectedOptions) {
      await this.getCurrentDataView();
      await this.buildFilter();
    }
    this.setInitializationFinished();
    this.setupSubscriptions();
  };

  private buildFilter = async () => {
    const { fieldName, selectedOptions } = this.getInput();
    if (!selectedOptions || selectedOptions.length === 0) {
      this.updateOutput({ filters: [] });
      return;
    }
    const dataView = await this.getCurrentDataView();
    const field = dataView.getFieldByName(this.getInput().fieldName);

    if (!field) throw fieldMissingError(fieldName);

    let newFilter: Filter;
    if (selectedOptions.length === 1) {
      newFilter = buildPhraseFilter(field, selectedOptions[0], dataView);
    } else {
      newFilter = buildPhrasesFilter(field, selectedOptions, dataView);
    }

    newFilter.meta.key = field?.name;
    this.updateOutput({ filters: [newFilter] });
  };

  reload = () => {
    this.fetchAvailableOptions();
  };

  public destroy = () => {
    super.destroy();
    this.subscriptions.unsubscribe();
  };

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(
      <OptionsListReduxWrapper embeddable={this} reducers={optionsListReducers}>
        <OptionsListComponent
          componentStateSubject={this.componentStateSubject$}
          typeaheadSubject={this.typeaheadSubject}
        />
      </OptionsListReduxWrapper>,
      node
    );
  };
}
