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
import { debounceTime, map, distinctUntilChanged, skip } from 'rxjs/operators';

import { i18n } from '@kbn/i18n';
import {
  Filter,
  compareFilters,
  buildPhraseFilter,
  buildPhrasesFilter,
  COMPARE_ALL_OPTIONS,
  buildExistsFilter,
} from '@kbn/es-query';
import { ReduxEmbeddableTools, ReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { OptionsListReduxState } from '../types';
import { pluginServices } from '../../services';
import {
  ControlInput,
  ControlOutput,
  OptionsListEmbeddableInput,
  OPTIONS_LIST_CONTROL,
} from '../..';
import { getDefaultComponentState, optionsListReducers } from '../options_list_reducers';
import { OptionsListControl } from '../components/options_list_control';
import { ControlsDataViewsService } from '../../services/data_views/types';
import { ControlsOptionsListService } from '../../services/options_list/types';
import { OptionsListField } from '../../../common/options_list/types';
import { OptionsListStrings } from '../components/options_list_strings';

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

  private reduxEmbeddableTools: ReduxEmbeddableTools<
    OptionsListReduxState,
    typeof optionsListReducers
  >;

  constructor(
    reduxEmbeddablePackage: ReduxEmbeddablePackage,
    input: OptionsListEmbeddableInput,
    output: ControlOutput,
    parent?: IContainer
  ) {
    super(input, output, parent);

    // Destructure controls services
    ({ dataViews: this.dataViewsService, optionsList: this.optionsListService } =
      pluginServices.getServices());

    this.typeaheadSubject = new Subject<string>();

    // build redux embeddable tools
    this.reduxEmbeddableTools = reduxEmbeddablePackage.createTools<
      OptionsListReduxState,
      typeof optionsListReducers
    >({
      embeddable: this,
      reducers: optionsListReducers,
      initialComponentState: getDefaultComponentState(),
    });

    this.initialize();
  }

  public getInputPlaceHolder = () =>
    this.reduxEmbeddableTools.getState().explicitInput.placeholder ??
    OptionsListStrings.control.getPlaceholder();

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
        .pipe(
          distinctUntilChanged(
            (a, b) =>
              a.exclude === b.exclude &&
              a.existsSelected === b.existsSelected &&
              isEqual(a.selectedOptions, b.selectedOptions)
          )
        )
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
      actions: { setField, setDataViewId },
    } = this.reduxEmbeddableTools;

    const {
      explicitInput: { dataViewId, fieldName, parentFieldName, childFieldName },
    } = getState();

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

      dispatch(setDataViewId(this.dataView?.id));
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

        // pair up keyword / text fields for case insensitive search
        const childField =
          (childFieldName && this.dataView.getFieldByName(childFieldName)) || undefined;
        const parentField =
          (parentFieldName && this.dataView.getFieldByName(parentFieldName)) || undefined;
        const textFieldName = childField?.esTypes?.includes('text')
          ? childField.name
          : parentField?.esTypes?.includes('text')
          ? parentField.name
          : undefined;

        const optionsListField: OptionsListField = originalField.toSpec();
        optionsListField.textFieldName = textFieldName;

        this.field = optionsListField;
      } catch (e) {
        this.onFatalError(e);
      }
      dispatch(setField(this.field));
    }

    return { dataView: this.dataView, field: this.field! };
  };

  private runOptionsListQuery = async () => {
    const {
      dispatch,
      getState,
      actions: { setLoading, publishFilters, setSearchString, updateQueryResults },
    } = this.reduxEmbeddableTools;

    const previousFieldName = this.field?.name;
    const { dataView, field } = await this.getCurrentDataViewAndField();
    if (!dataView || !field) return;

    if (previousFieldName && field.name !== previousFieldName) {
      dispatch(setSearchString(''));
    }

    const {
      componentState: { searchString },
      explicitInput: { selectedOptions, runPastTimeout, existsSelected, sort },
    } = getState();
    dispatch(setLoading(true));
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
      const { suggestions, invalidSelections, totalCardinality, rejected } =
        await this.optionsListService.runOptionsListRequest(
          {
            sort,
            field,
            query,
            filters,
            dataView,
            timeRange,
            searchString: searchString.value,
            runPastTimeout,
            selectedOptions,
          },
          this.abortController.signal
        );
      if (rejected) {
        // This prevents a rejected request (which can happen, for example, when a user types a search string too quickly)
        // from prematurely setting loading to `false` and updating the suggestions to show "No results"
        return;
      }

      if (
        (!selectedOptions && !existsSelected) ||
        isEmpty(invalidSelections) ||
        ignoreParentSettings?.ignoreValidations
      ) {
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
        for (const selectedOption of selectedOptions ?? []) {
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
    } else {
      batch(() => {
        dispatch(
          updateQueryResults({
            availableOptions: {},
          })
        );
        dispatch(setLoading(false));
      });
    }
  };

  private buildFilter = async () => {
    const { getState } = this.reduxEmbeddableTools;
    const { validSelections } = getState().componentState ?? {};
    const { existsSelected } = getState().explicitInput ?? {};
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

  reload = (clearCache: boolean = false) => {
    if (clearCache) this.optionsListService.clearOptionsListCache();
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
          <OptionsListControl typeaheadSubject={this.typeaheadSubject} />
        </OptionsListReduxWrapper>
      </KibanaThemeProvider>,
      node
    );
  };

  public isChained() {
    return true;
  }
}
