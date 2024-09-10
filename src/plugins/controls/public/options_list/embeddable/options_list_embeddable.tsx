/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { isEmpty, isEqual } from 'lodash';
import React, { createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import { batch } from 'react-redux';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  skip,
  Subject,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';

import { DataView, FieldSpec } from '@kbn/data-views-plugin/public';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import {
  buildExistsFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  compareFilters,
  COMPARE_ALL_OPTIONS,
  Filter,
} from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import {
  ControlGroupContainer,
  ControlInput,
  ControlOutput,
  OptionsListEmbeddableInput,
  OPTIONS_LIST_CONTROL,
} from '../..';
import { OptionsListSelection } from '../../../common/options_list/options_list_selections';
import { ControlFilterOutput } from '../../control_group/types';
import { pluginServices } from '../../services';
import { ControlsDataViewsService } from '../../services/data_views/types';
import { ControlsOptionsListService } from '../../services/options_list/types';
import { CanClearSelections } from '../../types';
import { OptionsListControl } from '../components/options_list_control';
import { getDefaultComponentState, optionsListReducers } from '../options_list_reducers';
import { MIN_OPTIONS_LIST_REQUEST_SIZE, OptionsListReduxState } from '../types';

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

export class OptionsListEmbeddable
  extends Embeddable<OptionsListEmbeddableInput, ControlOutput>
  implements CanClearSelections
{
  public readonly type = OPTIONS_LIST_CONTROL;
  public deferEmbeddableLoad = true;
  public parent: ControlGroupContainer;

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
    this.parent = parent as ControlGroupContainer;

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
    if (initialSelectedOptions) {
      const {
        explicitInput: { existsSelected, exclude },
      } = this.getState();
      const { filters } = await this.selectionsToFilters({
        existsSelected,
        exclude,
        selectedOptions: initialSelectedOptions,
      });
      this.dispatch.publishFilters(filters);
    }
    this.setInitializationFinished();

    this.dispatch.setAllowExpensiveQueries(
      await this.optionsListService.getAllowExpensiveQueries()
    );

    this.runOptionsListQuery().then(async () => {
      this.setupSubscriptions();
    });
  };

  private setupSubscriptions = () => {
    const dataFetchPipe = this.getInput$().pipe(
      map((newInput) => ({
        validate: !Boolean(newInput.ignoreParentSettings?.ignoreValidations),
        lastReloadRequestTime: newInput.lastReloadRequestTime,
        existsSelected: newInput.existsSelected,
        searchTechnique: newInput.searchTechnique,
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
          ),
          tap(({ selectedOptions: newSelectedOptions }) => {
            if (!newSelectedOptions || isEmpty(newSelectedOptions)) {
              this.dispatch.clearValidAndInvalidSelections({});
            } else {
              const { invalidSelections } = this.getState().componentState ?? {};
              const newValidSelections: OptionsListSelection[] = [];
              const newInvalidSelections: OptionsListSelection[] = [];
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
          }),
          switchMap(async () => {
            const { filters: newFilters } = await this.buildFilter();
            this.dispatch.publishFilters(newFilters);
          })
        )
        .subscribe()
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
      } catch (e) {
        this.dispatch.setErrorMessage(e.message);
      }

      this.dispatch.setDataViewId(this.dataView?.id);
    }

    if (this.dataView && (!this.field || this.field.name !== fieldName)) {
      const field = this.dataView.getFieldByName(fieldName);
      if (field) {
        this.field = field.toSpec();
        this.dispatch.setField(this.field);
      } else {
        this.dispatch.setErrorMessage(
          i18n.translate('controls.optionsList.errors.fieldNotFound', {
            defaultMessage: 'Could not locate field: {fieldName}',
            values: { fieldName },
          })
        );
      }
    }

    return { dataView: this.dataView, field: this.field };
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
      explicitInput: { selectedOptions, runPastTimeout, existsSelected, sort, searchTechnique },
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
          searchTechnique,
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
        this.dispatch.setErrorMessage(response.error.message);
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
        this.reportInvalidSelections(false);
      } else {
        const valid: OptionsListSelection[] = [];
        const invalid: OptionsListSelection[] = [];
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
        this.reportInvalidSelections(true);
      }

      batch(() => {
        this.dispatch.setErrorMessage(undefined);
        this.dispatch.setLoading(false);
      });
    } else {
      batch(() => {
        this.dispatch.setErrorMessage(undefined);
        this.dispatch.updateQueryResults({
          availableOptions: [],
        });
        this.dispatch.setLoading(false);
      });
    }
  };

  private reportInvalidSelections = (hasInvalidSelections: boolean) => {
    this.parent?.reportInvalidSelections({
      id: this.id,
      hasInvalidSelections,
    });
  };

  public selectionsToFilters = async (
    input: Partial<OptionsListEmbeddableInput>
  ): Promise<ControlFilterOutput> => {
    const { existsSelected, exclude, selectedOptions } = input;

    if ((!selectedOptions || isEmpty(selectedOptions)) && !existsSelected) {
      return { filters: [] };
    }

    const { dataView, field } = await this.getCurrentDataViewAndField();
    if (!dataView || !field) return { filters: [] };

    let newFilter: Filter | undefined;
    if (existsSelected) {
      newFilter = buildExistsFilter(field, dataView);
    } else if (selectedOptions) {
      if (selectedOptions.length === 1) {
        newFilter = buildPhraseFilter(field, selectedOptions[0], dataView);
      } else {
        newFilter = buildPhrasesFilter(field, selectedOptions, dataView);
      }
    }

    if (!newFilter) return { filters: [] };
    newFilter.meta.key = field?.name;
    if (exclude) newFilter.meta.negate = true;
    return { filters: [newFilter] };
  };

  private buildFilter = async (): Promise<ControlFilterOutput> => {
    const {
      explicitInput: { existsSelected, exclude, selectedOptions },
    } = this.getState();

    return await this.selectionsToFilters({
      existsSelected,
      exclude,
      selectedOptions,
    });
  };

  public clearSelections() {
    this.dispatch.clearSelections({});
    this.reportInvalidSelections(false);
  }

  reload = () => {
    // clear cache when reload is requested
    this.optionsListService.clearOptionsListCache();
    this.runOptionsListQuery();
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
      <KibanaRenderContextProvider {...pluginServices.getServices().core}>
        <OptionsListEmbeddableContext.Provider value={this}>
          <OptionsListControl
            typeaheadSubject={this.typeaheadSubject}
            loadMoreSubject={this.loadMoreSubject}
          />
        </OptionsListEmbeddableContext.Provider>
      </KibanaRenderContextProvider>,
      node
    );
  };

  public isChained() {
    return true;
  }
}
