/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import {
  compareFilters,
  buildRangeFilter,
  COMPARE_ALL_OPTIONS,
  RangeFilterParams,
  Filter,
  Query,
  AggregateQuery,
} from '@kbn/es-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { get, isEqual } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { Subscription, BehaviorSubject, lastValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, skip, map } from 'rxjs/operators';

import {
  withSuspense,
  LazyReduxEmbeddableWrapper,
  ReduxEmbeddableWrapperPropsWithChildren,
} from '@kbn/presentation-util-plugin/public';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';

import { ControlsDataViewsService } from '../../services/data_views';
import { ControlsDataService } from '../../services/data';
import { ControlInput, ControlOutput } from '../..';
import { pluginServices } from '../../services';

import { RangeSliderComponent, RangeSliderComponentState } from './range_slider.component';
import { rangeSliderReducers } from './range_slider_reducers';
import { RangeSliderStrings } from './range_slider_strings';
import { RangeSliderEmbeddableInput, RANGE_SLIDER_CONTROL } from './types';

const RangeSliderReduxWrapper = withSuspense<
  ReduxEmbeddableWrapperPropsWithChildren<RangeSliderEmbeddableInput>
>(LazyReduxEmbeddableWrapper);

const diffDataFetchProps = (
  current?: RangeSliderDataFetchProps,
  last?: RangeSliderDataFetchProps
) => {
  if (!current || !last) return false;
  const { filters: currentFilters, ...currentWithoutFilters } = current;
  const { filters: lastFilters, ...lastWithoutFilters } = last;
  if (!deepEqual(currentWithoutFilters, lastWithoutFilters)) return false;
  if (!compareFilters(lastFilters ?? [], currentFilters ?? [], COMPARE_ALL_OPTIONS)) return false;
  return true;
};

interface RangeSliderDataFetchProps {
  fieldName: string;
  dataViewId: string;
  query?: ControlInput['query'];
  filters?: ControlInput['filters'];
  validate?: boolean;
}

const fieldMissingError = (fieldName: string) =>
  new Error(`field ${fieldName} not found in index pattern`);

export class RangeSliderEmbeddable extends Embeddable<RangeSliderEmbeddableInput, ControlOutput> {
  public readonly type = RANGE_SLIDER_CONTROL;
  public deferEmbeddableLoad = true;

  private subscriptions: Subscription = new Subscription();
  private node?: HTMLElement;

  // Controls services
  private dataService: ControlsDataService;
  private dataViewsService: ControlsDataViewsService;

  // Internal data fetching state for this input control.
  private dataView?: DataView;
  private field?: DataViewField;

  // State to be passed down to component
  private componentState: RangeSliderComponentState;
  private componentStateSubject$ = new BehaviorSubject<RangeSliderComponentState>({
    min: '',
    max: '',
    loading: true,
    fieldFormatter: (value: string) => value,
  });

  constructor(input: RangeSliderEmbeddableInput, output: ControlOutput, parent?: IContainer) {
    super(input, output, parent); // get filters for initial output...

    // Destructure controls services
    ({ data: this.dataService, dataViews: this.dataViewsService } = pluginServices.getServices());

    this.componentState = {
      min: '',
      max: '',
      loading: true,
      fieldFormatter: (value: string) => value,
      isInvalid: false,
    };
    this.updateComponentState(this.componentState);

    this.initialize();
  }

  private initialize = async () => {
    const initialValue = this.getInput().value;
    if (!initialValue) {
      this.setInitializationFinished();
    }

    this.runRangeSliderQuery().then(async () => {
      if (initialValue) {
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
      distinctUntilChanged(diffDataFetchProps),
      skip(1)
    );

    // fetch available min/max when input changes
    this.subscriptions.add(dataFetchPipe.subscribe(this.runRangeSliderQuery));

    // build filters when value change
    this.subscriptions.add(
      this.getInput$()
        .pipe(
          debounceTime(400),
          distinctUntilChanged((a, b) => isEqual(a.value, b.value)),
          skip(1) // skip the first input update because initial filters will be built by initialize.
        )
        .subscribe(this.buildFilter)
    );
  };

  private getCurrentDataViewAndField = async (): Promise<{
    dataView?: DataView;
    field?: DataViewField;
  }> => {
    const { dataViewId, fieldName } = this.getInput();

    if (!this.dataView || this.dataView.id !== dataViewId) {
      try {
        this.dataView = await this.dataViewsService.get(dataViewId);
        if (!this.dataView)
          throw new Error(RangeSliderStrings.errors.getDataViewNotFoundError(dataViewId));
      } catch (e) {
        this.onFatalError(e);
      }
    }

    if (!this.field || this.field.name !== fieldName) {
      this.field = this.dataView?.getFieldByName(fieldName);
      if (this.field === undefined) {
        this.onFatalError(new Error(RangeSliderStrings.errors.getDataViewNotFoundError(fieldName)));
      }

      this.updateComponentState({
        field: this.field,
        fieldFormatter: this.field
          ? this.dataView?.getFormatterForField(this.field).getConverterFor('text')
          : (value: string) => value,
      });
    }

    return { dataView: this.dataView, field: this.field! };
  };

  private updateComponentState(changes: Partial<RangeSliderComponentState>) {
    this.componentState = {
      ...this.componentState,
      ...changes,
    };
    this.componentStateSubject$.next(this.componentState);
  }

  private runRangeSliderQuery = async () => {
    this.updateComponentState({ loading: true });
    this.updateOutput({ loading: true });
    const { dataView, field } = await this.getCurrentDataViewAndField();
    if (!dataView || !field) return;

    const embeddableInput = this.getInput();
    const { ignoreParentSettings, fieldName, query, timeRange } = embeddableInput;
    let { filters = [] } = embeddableInput;

    if (!field) {
      this.updateComponentState({ loading: false });
      this.updateOutput({ filters: [], loading: false });
      throw fieldMissingError(fieldName);
    }

    if (ignoreParentSettings?.ignoreFilters) {
      filters = [];
    }

    if (!ignoreParentSettings?.ignoreTimerange && timeRange) {
      const timeFilter = this.dataService.timefilter.createFilter(dataView, timeRange);
      if (timeFilter) {
        filters = filters.concat(timeFilter);
      }
    }

    const { min, max } = await this.fetchMinMax({
      dataView,
      field,
      filters,
      query,
    });

    this.updateComponentState({
      min: `${min ?? ''}`,
      max: `${max ?? ''}`,
    });

    // build filter with new min/max
    await this.buildFilter();
  };

  private fetchMinMax = async ({
    dataView,
    field,
    filters,
    query,
  }: {
    dataView: DataView;
    field: DataViewField;
    filters: Filter[];
    query?: Query | AggregateQuery;
  }) => {
    const searchSource = await this.dataService.searchSource.create();
    searchSource.setField('size', 0);
    searchSource.setField('index', dataView);

    searchSource.setField('filter', filters);

    if (query) {
      searchSource.setField('query', query);
    }

    const aggBody: any = {};

    if (field) {
      if (field.scripted) {
        aggBody.script = {
          source: field.script,
          lang: field.lang,
        };
      } else {
        aggBody.field = field.name;
      }
    }

    const aggs = {
      maxAgg: {
        max: aggBody,
      },
      minAgg: {
        min: aggBody,
      },
    };

    searchSource.setField('aggs', aggs);

    const resp = await lastValueFrom(searchSource.fetch$());

    const min = get(resp, 'rawResponse.aggregations.minAgg.value', '');
    const max = get(resp, 'rawResponse.aggregations.maxAgg.value', '');

    return { min, max };
  };

  private buildFilter = async () => {
    const {
      value: [selectedMin, selectedMax] = ['', ''],
      query,
      timeRange,
      filters = [],
      ignoreParentSettings,
    } = this.getInput();

    const availableMin = this.componentState.min;
    const availableMax = this.componentState.max;

    const hasData = !isEmpty(availableMin) && !isEmpty(availableMax);
    const hasLowerSelection = !isEmpty(selectedMin);
    const hasUpperSelection = !isEmpty(selectedMax);
    const hasEitherSelection = hasLowerSelection || hasUpperSelection;

    const { dataView, field } = await this.getCurrentDataViewAndField();
    if (!dataView || !field) return;

    if (!hasData || !hasEitherSelection) {
      this.updateComponentState({
        loading: false,
        isInvalid: !ignoreParentSettings?.ignoreValidations && hasEitherSelection,
      });
      this.updateOutput({ filters: [], dataViews: dataView && [dataView], loading: false });
      return;
    }

    const params = {} as RangeFilterParams;

    if (selectedMin) {
      params.gte = Math.max(parseFloat(selectedMin), parseFloat(availableMin));
    }

    if (selectedMax) {
      params.lte = Math.min(parseFloat(selectedMax), parseFloat(availableMax));
    }

    const rangeFilter = buildRangeFilter(field, params, dataView);

    rangeFilter.meta.key = field?.name;
    rangeFilter.meta.type = 'range';
    rangeFilter.meta.params = params;

    // Check if new range filter results in no data
    if (!ignoreParentSettings?.ignoreValidations) {
      const searchSource = await this.dataService.searchSource.create();

      filters.push(rangeFilter);

      const timeFilter = this.dataService.timefilter.createFilter(dataView, timeRange);

      if (timeFilter) {
        filters.push(timeFilter);
      }

      searchSource.setField('size', 0);
      searchSource.setField('index', dataView);

      searchSource.setField('filter', filters);

      if (query) {
        searchSource.setField('query', query);
      }

      const {
        rawResponse: {
          hits: { total },
        },
      } = await lastValueFrom(searchSource.fetch$());

      const docCount = typeof total === 'number' ? total : total?.value;

      if (!docCount) {
        this.updateComponentState({ loading: false, isInvalid: true });
        this.updateOutput({
          filters: [],
          dataViews: [dataView],
          loading: false,
        });
        return;
      }
    }

    this.updateComponentState({ loading: false, isInvalid: false });
    this.updateOutput({ filters: [rangeFilter], dataViews: [dataView], loading: false });
  };

  public reload = () => {
    this.runRangeSliderQuery();
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
      <RangeSliderReduxWrapper embeddable={this} reducers={rangeSliderReducers}>
        <RangeSliderComponent
          componentStateSubject={this.componentStateSubject$}
          ignoreValidation={
            this.getInput().ignoreParentSettings !== undefined &&
            this.getInput().ignoreParentSettings?.ignoreValidations !== undefined &&
            this.getInput().ignoreParentSettings?.ignoreValidations!
          }
        />
      </RangeSliderReduxWrapper>,
      node
    );
  };
}
