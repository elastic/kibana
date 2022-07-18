/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { batch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { isEmpty, isEqual } from 'lodash';
import { merge, Subject, Subscription } from 'rxjs';
import { tap, debounceTime, map, distinctUntilChanged, skip } from 'rxjs/operators';

import {
  Filter,
  compareFilters,
  buildPhraseFilter,
  buildPhrasesFilter,
  COMPARE_ALL_OPTIONS,
} from '@kbn/es-query';
import {
  createReduxEmbeddableTools,
  ReduxEmbeddableTools,
} from '@kbn/presentation-util-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import {
  OptionsListEmbeddableInput,
  OptionsListField,
  OptionsListReduxState,
  OPTIONS_LIST_CONTROL,
} from './types';
import { OptionsListComponent } from './options_list_component';
import { ControlsOptionsListService } from '../../services/options_list';
import { ControlsDataViewsService } from '../../services/data_views';
import { optionsListReducers } from './options_list_reducers';
import { OptionsListStrings } from './options_list_strings';
import { ControlInput, ControlOutput } from '../..';
import { pluginServices } from '../../services';

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
  private field?: OptionsListField;
  private searchString = '';

  private reduxEmbeddableTools: ReduxEmbeddableTools<
    OptionsListReduxState,
    typeof optionsListReducers
  >;

  constructor(input: OptionsListEmbeddableInput, output: ControlOutput, parent?: IContainer) {
    super(input, output, parent); // get filters for initial output...

    // Destructure controls services
    ({ dataViews: this.dataViewsService, optionsList: this.optionsListService } =
      pluginServices.getServices());

    this.typeaheadSubject = new Subject<string>();

    // build redux embeddable tools
    this.reduxEmbeddableTools = createReduxEmbeddableTools<
      OptionsListReduxState,
      typeof optionsListReducers
    >({
      embeddable: this,
      reducers: optionsListReducers,
    });

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
          const {
            actions: {
              clearValidAndInvalidSelections,
              setValidAndInvalidSelections,
              publishFilters,
            },
            dispatch,
          } = this.reduxEmbeddableTools;

          if (!newSelectedOptions || isEmpty(newSelectedOptions)) {
            dispatch(clearValidAndInvalidSelections({}));
          } else {
            const { invalidSelections } = this.reduxEmbeddableTools.getState().componentState ?? {};
            const newValidSelections: string[] = [];
            const newInvalidSelections: string[] = [];
            for (const selectedOption of newSelectedOptions) {
              if (invalidSelections?.includes(selectedOption)) {
                newInvalidSelections.push(selectedOption);
                continue;
              }
              newValidSelections.push(selectedOption);
            }
            dispatch(
              setValidAndInvalidSelections({
                validSelections: newValidSelections,
                invalidSelections: newInvalidSelections,
              })
            );
          }
          const newFilters = await this.buildFilter();
          dispatch(publishFilters(newFilters));
        })
    );
  };

  private getCurrentDataViewAndField = async (): Promise<{
    dataView?: DataView;
    field?: OptionsListField;
  }> => {
    const {
      dispatch,
      getState,
      actions: { setField, setDataView },
    } = this.reduxEmbeddableTools;

    const {
      input: { dataViewId, fieldName, parentFieldName, childFieldName },
    } = getState();

    if (!this.dataView || this.dataView.id !== dataViewId) {
      try {
        this.dataView = await this.dataViewsService.get(dataViewId);
        if (!this.dataView)
          throw new Error(OptionsListStrings.errors.getDataViewNotFoundError(dataViewId));
      } catch (e) {
        this.onFatalError(e);
      }
      dispatch(setDataView(this.dataView));
    }

    if (this.dataView && (!this.field || this.field.name !== fieldName)) {
      const originalField = this.dataView?.getFieldByName(fieldName);
      const childField =
        (childFieldName && this.dataView?.getFieldByName(childFieldName)) || undefined;
      const parentField =
        (parentFieldName && this.dataView?.getFieldByName(parentFieldName)) || undefined;

      const textFieldName = childField?.esTypes?.includes('text')
        ? childField.name
        : parentField?.esTypes?.includes('text')
        ? parentField.name
        : undefined;
      (originalField as OptionsListField).textFieldName = textFieldName;
      this.field = originalField;

      if (this.field === undefined) {
        this.onFatalError(new Error(OptionsListStrings.errors.getDataViewNotFoundError(fieldName)));
      }
      dispatch(setField(this.field));
    }

    return { dataView: this.dataView, field: this.field! };
  };

  private runOptionsListQuery = async () => {
    const { dataView, field } = await this.getCurrentDataViewAndField();

    const {
      dispatch,
      getState,
      actions: { setLoading, updateQueryResults, publishFilters },
    } = this.reduxEmbeddableTools;

    if (!dataView || !field) return;

    dispatch(setLoading(true));

    const {
      input: { ignoreParentSettings, filters, query, selectedOptions, timeRange, runPastTimeout },
    } = getState();

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
          runPastTimeout,
          selectedOptions,
          searchString: this.searchString,
        },
        this.abortController.signal
      );
    if (!selectedOptions || isEmpty(invalidSelections) || ignoreParentSettings?.ignoreValidations) {
      dispatch(
        updateQueryResults({
          availableOptions: suggestions,
          invalidSelections: undefined,
          validSelections: selectedOptions,
          totalCardinality,
        })
      );
    } else {
      const valid: string[] = [];
      const invalid: string[] = [];

      for (const selectedOption of selectedOptions) {
        if (invalidSelections?.includes(selectedOption)) invalid.push(selectedOption);
        else valid.push(selectedOption);
      }
      dispatch(
        updateQueryResults({
          availableOptions: suggestions,
          invalidSelections: invalid,
          validSelections: valid,
          totalCardinality,
        })
      );
    }

    // publish filter
    const newFilters = await this.buildFilter();
    batch(() => {
      dispatch(setLoading(false));
      dispatch(publishFilters(newFilters));
    });
  };

  private buildFilter = async () => {
    const { getState } = this.reduxEmbeddableTools;
    const { validSelections } = getState().componentState ?? {};

    if (!validSelections || isEmpty(validSelections)) {
      return [];
    }
    const { dataView, field } = await this.getCurrentDataViewAndField();
    if (!dataView || !field) return;

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
    this.reduxEmbeddableTools.cleanup();
  };

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    const { Wrapper: OptionsListReduxWrapper } = this.reduxEmbeddableTools;
    this.node = node;
    ReactDOM.render(
      <KibanaThemeProvider theme$={pluginServices.getServices().theme.theme$}>
        <OptionsListReduxWrapper>
          <OptionsListComponent typeaheadSubject={this.typeaheadSubject} />
        </OptionsListReduxWrapper>
      </KibanaThemeProvider>,
      node
    );
  };
}
