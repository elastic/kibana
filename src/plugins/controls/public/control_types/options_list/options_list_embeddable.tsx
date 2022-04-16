/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Filter,
  compareFilters,
  buildPhraseFilter,
  buildPhrasesFilter,
  COMPARE_ALL_OPTIONS,
} from '@kbn/es-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { isEmpty, isEqual } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { merge, Subject, Subscription, BehaviorSubject } from 'rxjs';
import { tap, debounceTime, map, distinctUntilChanged, skip } from 'rxjs/operators';

import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import {
  withSuspense,
  LazyReduxEmbeddableWrapper,
  ReduxEmbeddableWrapperPropsWithChildren,
} from '@kbn/presentation-util-plugin/public';
import { OptionsListComponent, OptionsListComponentState } from './options_list_component';
import { OptionsListEmbeddableInput, OPTIONS_LIST_CONTROL } from './types';
import { ControlsDataViewsService } from '../../services/data_views';
import { optionsListReducers } from './options_list_reducers';
import { OptionsListStrings } from './options_list_strings';
import { ControlInput, ControlOutput } from '../..';
import { pluginServices } from '../../services';
import { ControlsOptionsListService } from '../../services/options_list';

const OptionsListReduxWrapper = withSuspense<
  ReduxEmbeddableWrapperPropsWithChildren<OptionsListEmbeddableInput>
>(LazyReduxEmbeddableWrapper);

const diffDataFetchProps = (
  last?: OptionsListDataFetchProps,
  current?: OptionsListDataFetchProps
) => {
  if (!current || !last) return false;
  const { filters: currentFilters, ...currentWithoutFilters } = current;
  const { filters: lastFilters, ...lastWithoutFilters } = last;
  if (!deepEqual(currentWithoutFilters, lastWithoutFilters)) return false;
  if (!compareFilters(lastFilters ?? [], currentFilters ?? [], COMPARE_ALL_OPTIONS)) return false;
  return true;
};

interface OptionsListDataFetchProps {
  search?: string;
  fieldName: string;
  dataViewId: string;
  validate?: boolean;
  query?: ControlInput['query'];
  filters?: ControlInput['filters'];
}

export class OptionsListEmbeddable extends Embeddable<OptionsListEmbeddableInput, ControlOutput> {
  public readonly type = OPTIONS_LIST_CONTROL;
  public deferEmbeddableLoad = true;

  private subscriptions: Subscription = new Subscription();
  private node?: HTMLElement;

  // Controls services
  private dataViewsService: ControlsDataViewsService;
  private optionsListService: ControlsOptionsListService;

  // Internal data fetching state for this input control.
  private typeaheadSubject: Subject<string> = new Subject<string>();
  private abortController?: AbortController;
  private dataView?: DataView;
  private field?: DataViewField;
  private searchString = '';

  // State to be passed down to component
  private componentState: OptionsListComponentState;
  private componentStateSubject$ = new BehaviorSubject<OptionsListComponentState>({
    invalidSelections: [],
    validSelections: [],
    loading: true,
  });

  constructor(input: OptionsListEmbeddableInput, output: ControlOutput, parent?: IContainer) {
    super(input, output, parent); // get filters for initial output...

    // Destructure controls services
    ({ dataViews: this.dataViewsService, optionsList: this.optionsListService } =
      pluginServices.getServices());

    this.componentState = { loading: true };
    this.updateComponentState(this.componentState);
    this.typeaheadSubject = new Subject<string>();

    this.initialize();
  }

  private initialize = async () => {
    const { selectedOptions: initialSelectedOptions } = this.getInput();
    if (!initialSelectedOptions) this.setInitializationFinished();
    this.runOptionsListQuery().then(async () => {
      if (initialSelectedOptions) {
        await this.buildFilter();
        this.setInitializationFinished();
      }
      this.setupSubscriptions();
    });
  };

  private setupSubscriptions = () => {
    const dataFetchPipe = this.getInput$().pipe(
      map((newInput) => ({
        validate: !Boolean(newInput.ignoreParentSettings?.ignoreValidations),
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
    const typeaheadPipe = this.typeaheadSubject.pipe(
      tap((newSearchString) => (this.searchString = newSearchString)),
      debounceTime(100)
    );

    // fetch available options when input changes or when search string has changed
    this.subscriptions.add(
      merge(dataFetchPipe, typeaheadPipe)
        .pipe(skip(1)) // Skip the first input update because options list query will be run by initialize.
        .subscribe(this.runOptionsListQuery)
    );

    /**
     * when input selectedOptions changes, check all selectedOptions against the latest value of invalidSelections, and publish filter
     **/
    this.subscriptions.add(
      this.getInput$()
        .pipe(distinctUntilChanged((a, b) => isEqual(a.selectedOptions, b.selectedOptions)))
        .subscribe(async ({ selectedOptions: newSelectedOptions }) => {
          if (!newSelectedOptions || isEmpty(newSelectedOptions)) {
            this.updateComponentState({
              validSelections: [],
              invalidSelections: [],
            });
          } else {
            const { invalidSelections } = this.componentStateSubject$.getValue();
            const newValidSelections: string[] = [];
            const newInvalidSelections: string[] = [];
            for (const selectedOption of newSelectedOptions) {
              if (invalidSelections?.includes(selectedOption)) {
                newInvalidSelections.push(selectedOption);
                continue;
              }
              newValidSelections.push(selectedOption);
            }
            this.updateComponentState({
              validSelections: newValidSelections,
              invalidSelections: newInvalidSelections,
            });
          }
          const newFilters = await this.buildFilter();
          this.updateOutput({ filters: newFilters });
        })
    );
  };

  private getCurrentDataViewAndField = async (): Promise<{
    dataView: DataView;
    field: DataViewField;
  }> => {
    const { dataViewId, fieldName } = this.getInput();
    if (!this.dataView || this.dataView.id !== dataViewId) {
      this.dataView = await this.dataViewsService.get(dataViewId);
      if (this.dataView === undefined) {
        this.onFatalError(
          new Error(OptionsListStrings.errors.getDataViewNotFoundError(dataViewId))
        );
      }
      this.updateOutput({ dataViews: [this.dataView] });
    }

    if (!this.field || this.field.name !== fieldName) {
      this.field = this.dataView.getFieldByName(fieldName);
      if (this.field === undefined) {
        this.onFatalError(new Error(OptionsListStrings.errors.getDataViewNotFoundError(fieldName)));
      }
      this.updateComponentState({ field: this.field });
    }

    return { dataView: this.dataView, field: this.field! };
  };

  private updateComponentState(changes: Partial<OptionsListComponentState>) {
    this.componentState = {
      ...this.componentState,
      ...changes,
    };
    this.componentStateSubject$.next(this.componentState);
  }

  private runOptionsListQuery = async () => {
    const { dataView, field } = await this.getCurrentDataViewAndField();
    this.updateComponentState({ loading: true });
    this.updateOutput({ loading: true, dataViews: [dataView] });
    const { ignoreParentSettings, filters, query, selectedOptions, timeRange } = this.getInput();

    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    const { suggestions, invalidSelections, totalCardinality } =
      await this.optionsListService.runOptionsListRequest(
        {
          field,
          query,
          filters,
          dataView,
          timeRange,
          selectedOptions,
          searchString: this.searchString,
        },
        this.abortController.signal
      );

    if (!selectedOptions || isEmpty(invalidSelections) || ignoreParentSettings?.ignoreValidations) {
      this.updateComponentState({
        availableOptions: suggestions,
        invalidSelections: undefined,
        validSelections: selectedOptions,
        totalCardinality,
        loading: false,
      });
    } else {
      const valid: string[] = [];
      const invalid: string[] = [];

      for (const selectedOption of selectedOptions) {
        if (invalidSelections?.includes(selectedOption)) invalid.push(selectedOption);
        else valid.push(selectedOption);
      }
      this.updateComponentState({
        availableOptions: suggestions,
        invalidSelections: invalid,
        validSelections: valid,
        totalCardinality,
        loading: false,
      });
    }

    // publish filter
    const newFilters = await this.buildFilter();
    this.updateOutput({ loading: false, filters: newFilters });
  };

  private buildFilter = async () => {
    const { validSelections } = this.componentState;
    if (!validSelections || isEmpty(validSelections)) {
      return [];
    }
    const { dataView, field } = await this.getCurrentDataViewAndField();

    let newFilter: Filter;
    if (validSelections.length === 1) {
      newFilter = buildPhraseFilter(field, validSelections[0], dataView);
    } else {
      newFilter = buildPhrasesFilter(field, validSelections, dataView);
    }

    newFilter.meta.key = field?.name;
    return [newFilter];
  };

  reload = () => {
    this.runOptionsListQuery();
  };

  public destroy = () => {
    super.destroy();
    this.abortController?.abort();
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
