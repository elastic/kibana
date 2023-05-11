/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ReactDOM from 'react-dom';
import { batch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { isEmpty, isEqual } from 'lodash';
import { merge, Subject, Subscription } from 'rxjs';
import React, { createContext, useContext } from 'react';
import { debounceTime, map, distinctUntilChanged, skip } from 'rxjs/operators';

import {
  Filter,
  compareFilters,
  buildPhraseFilter,
  buildPhrasesFilter,
  COMPARE_ALL_OPTIONS,
  buildExistsFilter,
} from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { DataView, FieldSpec } from '@kbn/data-views-plugin/public';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import {
  ControlInput,
  ControlOutput,
  OPTIONS_LIST_CONTROL,
  OptionsListEmbeddableInput,
} from '../..';
import { pluginServices } from '../../services';
import { MIN_OPTIONS_LIST_REQUEST_SIZE, OptionsListReduxState } from '../types';
import { OptionsListControl } from '../components/options_list_control';
import { ControlsDataViewsService } from '../../services/data_views/types';
import { ControlsOptionsListService } from '../../services/options_list/types';
import { getDefaultComponentState, optionsListReducers } from '../options_list_reducers';

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

export const OptionsListEmbeddableContext = createContext<OptionsListEmbeddable | null>(null);
export const useOptionsList = (): OptionsListEmbeddable => {
  const optionsList = useContext<OptionsListEmbeddable | null>(OptionsListEmbeddableContext);
  if (optionsList == null) {
    throw new Error('useOptionsList must be used inside OptionsListEmbeddableContext.');
  }
  return optionsList!;
};

type OptionsListReduxEmbeddableTools = ReduxEmbeddableTools<
  OptionsListReduxState,
  typeof optionsListReducers
>;

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
  private loadMoreSubject: Subject<number> = new Subject<number>();
  private abortController?: AbortController;
  private dataView?: DataView;
  private field?: FieldSpec;

  // state management
  public select: OptionsListReduxEmbeddableTools['select'];
  public getState: OptionsListReduxEmbeddableTools['getState'];
  public dispatch: OptionsListReduxEmbeddableTools['dispatch'];
  public onStateChange: OptionsListReduxEmbeddableTools['onStateChange'];

  private cleanupStateTools: () => void;

  constructor(
    reduxToolsPackage: ReduxToolsPackage,
    input: OptionsListEmbeddableInput,
    output: ControlOutput,
    parent?: IContainer
  ) {
    super(input, output, parent);

    // Destructure controls services
    ({ dataViews: this.dataViewsService, optionsList: this.optionsListService } =
      pluginServices.getServices());

    this.typeaheadSubject = new Subject<string>();
    this.loadMoreSubject = new Subject<number>();

    // build redux embeddable tools
    const reduxEmbeddableTools = reduxToolsPackage.createReduxEmbeddableTools<
      OptionsListReduxState,
      typeof optionsListReducers
    >({
      embeddable: this,
      reducers: optionsListReducers,
      initialComponentState: getDefaultComponentState(),
    });

    this.select = reduxEmbeddableTools.select;
    this.getState = reduxEmbeddableTools.getState;
    this.dispatch = reduxEmbeddableTools.dispatch;
    this.cleanupStateTools = reduxEmbeddableTools.cleanup;
    this.onStateChange = reduxEmbeddableTools.onStateChange;

    this.initialize();
  }

  private initialize = async () => {
    const { selectedOptions: initialSelectedOptions } = this.getInput();
    if (!initialSelectedOptions) this.setInitializationFinished();

    this.dispatch.setAllowExpensiveQueries(
      await this.optionsListService.getAllowExpensiveQueries()
    );

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
        existsSelected: newInput.existsSelected,
        dataViewId: newInput.dataViewId,
        fieldName: newInput.fieldName,
        timeRange: newInput.timeRange,
        timeslice: newInput.timeslice,
        exclude: newInput.exclude,
        filters: newInput.filters,
        query: newInput.query,
        sort: newInput.sort,
      })),
      distinctUntilChanged(diffDataFetchProps)
    );

    // debounce typeahead pipe to slow down search string related queries
    const typeaheadPipe = this.typeaheadSubject.pipe(debounceTime(100));
    const loadMorePipe = this.loadMoreSubject.pipe(debounceTime(100));

    // fetch available options when input changes or when search string has changed
    this.subscriptions.add(
      merge(dataFetchPipe, typeaheadPipe)
        .pipe(skip(1)) // Skip the first input update because options list query will be run by initialize.
        .subscribe(() => {
          this.runOptionsListQuery();
        })
    );
    // fetch more options when reaching the bottom of the available options
    this.subscriptions.add(
      loadMorePipe.subscribe((size) => {
        this.runOptionsListQuery(size);
      })
    );

    /**
     * when input selectedOptions changes, check all selectedOptions against the latest value of invalidSelections, and publish filter
     **/
    this.subscriptions.add(
      this.getInput$()
        .pipe(
          distinctUntilChanged(
            (a, b) =>
              a.exclude === b.exclude &&
              a.existsSelected === b.existsSelected &&
              isEqual(a.selectedOptions, b.selectedOptions)
          )
        )
        .subscribe(async ({ selectedOptions: newSelectedOptions }) => {
          if (!newSelectedOptions || isEmpty(newSelectedOptions)) {
            this.dispatch.clearValidAndInvalidSelections({});
          } else {
            const { invalidSelections } = this.getState().componentState ?? {};
            const newValidSelections: string[] = [];
            const newInvalidSelections: string[] = [];
            for (const selectedOption of newSelectedOptions) {
              if (invalidSelections?.includes(selectedOption)) {
                newInvalidSelections.push(selectedOption);
                continue;
              }
              newValidSelections.push(selectedOption);
            }
            this.dispatch.setValidAndInvalidSelections({
              validSelections: newValidSelections,
              invalidSelections: newInvalidSelections,
            });
          }
          const newFilters = await this.buildFilter();
          this.dispatch.publishFilters(newFilters);
        })
    );
  };

  private getCurrentDataViewAndField = async (): Promise<{
    dataView?: DataView;
    field?: FieldSpec;
  }> => {
    const {
      explicitInput: { dataViewId, fieldName },
    } = this.getState();

    if (!this.dataView || this.dataView.id !== dataViewId) {
      try {
        this.dataView = await this.dataViewsService.get(dataViewId);
        if (!this.dataView)
          throw new Error(
            i18n.translate('controls.optionsList.errors.dataViewNotFound', {
              defaultMessage: 'Could not locate data view: {dataViewId}',
              values: { dataViewId },
            })
          );
      } catch (e) {
        this.onFatalError(e);
      }

      this.dispatch.setDataViewId(this.dataView?.id);
    }

    if (this.dataView && (!this.field || this.field.name !== fieldName)) {
      try {
        const originalField = this.dataView.getFieldByName(fieldName);
        if (!originalField) {
          throw new Error(
            i18n.translate('controls.optionsList.errors.fieldNotFound', {
              defaultMessage: 'Could not locate field: {fieldName}',
              values: { fieldName },
            })
          );
        }

        this.field = originalField.toSpec();
      } catch (e) {
        this.onFatalError(e);
      }
      this.dispatch.setField(this.field);
    }

    return { dataView: this.dataView, field: this.field! };
  };

  private runOptionsListQuery = async (size: number = MIN_OPTIONS_LIST_REQUEST_SIZE) => {
    const previousFieldName = this.field?.name;
    const { dataView, field } = await this.getCurrentDataViewAndField();
    if (!dataView || !field) return;

    if (previousFieldName && field.name !== previousFieldName) {
      this.dispatch.setSearchString('');
    }

    const {
      componentState: { searchString, allowExpensiveQueries },
      explicitInput: { selectedOptions, runPastTimeout, existsSelected, sort },
    } = this.getState();
    this.dispatch.setLoading(true);
    if (searchString.valid) {
      // need to get filters, query, ignoreParentSettings, and timeRange from input for inheritance
      const {
        ignoreParentSettings,
        filters,
        query,
        timeRange: globalTimeRange,
        timeslice,
      } = this.getInput();
      if (this.abortController) this.abortController.abort();
      this.abortController = new AbortController();
      const timeRange =
        timeslice !== undefined
          ? {
              from: new Date(timeslice[0]).toISOString(),
              to: new Date(timeslice[1]).toISOString(),
              mode: 'absolute' as 'absolute',
            }
          : globalTimeRange;

      const response = await this.optionsListService.runOptionsListRequest(
        {
          sort,
          size,
          field,
          query,
          filters,
          dataView,
          timeRange,
          runPastTimeout,
          selectedOptions,
          allowExpensiveQueries,
          searchString: searchString.value,
        },
        this.abortController.signal
      );
      if (this.optionsListService.optionsListResponseWasFailure(response)) {
        if (response.error === 'aborted') {
          // This prevents an aborted request (which can happen, for example, when a user types a search string too quickly)
          // from prematurely setting loading to `false` and updating the suggestions to show "No results"
          return;
        }
        this.onFatalError(response.error);
        return;
      }

      const { suggestions, invalidSelections, totalCardinality } = response;
      if (
        (!selectedOptions && !existsSelected) ||
        isEmpty(invalidSelections) ||
        ignoreParentSettings?.ignoreValidations
      ) {
        this.dispatch.updateQueryResults({
          availableOptions: suggestions,
          invalidSelections: undefined,
          validSelections: selectedOptions,
          totalCardinality,
        });
      } else {
        const valid: string[] = [];
        const invalid: string[] = [];
        for (const selectedOption of selectedOptions ?? []) {
          if (invalidSelections?.includes(selectedOption)) invalid.push(selectedOption);
          else valid.push(selectedOption);
        }
        this.dispatch.updateQueryResults({
          availableOptions: suggestions,
          invalidSelections: invalid,
          validSelections: valid,
          totalCardinality,
        });
      }

      // publish filter
      const newFilters = await this.buildFilter();
      batch(() => {
        this.dispatch.setLoading(false);
        this.dispatch.publishFilters(newFilters);
      });
    } else {
      batch(() => {
        this.dispatch.updateQueryResults({
          availableOptions: [],
        });
        this.dispatch.setLoading(false);
      });
    }
  };

  private buildFilter = async () => {
    const { validSelections } = this.getState().componentState ?? {};
    const { existsSelected } = this.getState().explicitInput ?? {};
    const { exclude } = this.getInput();

    if ((!validSelections || isEmpty(validSelections)) && !existsSelected) {
      return [];
    }
    const { dataView, field } = await this.getCurrentDataViewAndField();
    if (!dataView || !field) return;

    let newFilter: Filter | undefined;
    if (existsSelected) {
      newFilter = buildExistsFilter(field, dataView);
    } else if (validSelections) {
      if (validSelections.length === 1) {
        newFilter = buildPhraseFilter(field, validSelections[0], dataView);
      } else {
        newFilter = buildPhrasesFilter(field, validSelections, dataView);
      }
    }
    if (!newFilter) return [];

    newFilter.meta.key = field?.name;
    if (exclude) newFilter.meta.negate = true;
    return [newFilter];
  };

  reload = () => {
    // clear cache when reload is requested
    this.optionsListService.clearOptionsListCache();
    this.runOptionsListQuery();
  };

  public onFatalError = (e: Error) => {
    batch(() => {
      this.dispatch.setLoading(false);
      this.dispatch.setPopoverOpen(false);
    });
    super.onFatalError(e);
  };

  public destroy = () => {
    super.destroy();
    this.cleanupStateTools();
    this.abortController?.abort();
    this.subscriptions.unsubscribe();
    if (this.node) ReactDOM.unmountComponentAtNode(this.node);
  };

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(
      <KibanaThemeProvider theme$={pluginServices.getServices().theme.theme$}>
        <OptionsListEmbeddableContext.Provider value={this}>
          <OptionsListControl
            typeaheadSubject={this.typeaheadSubject}
            loadMoreSubject={this.loadMoreSubject}
          />
        </OptionsListEmbeddableContext.Provider>
      </KibanaThemeProvider>,
      node
    );
  };

  public isChained() {
    return true;
  }
}
