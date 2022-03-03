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
  buildRangeFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
} from '@kbn/es-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { isEqual, get } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { merge, Subject, Subscription, BehaviorSubject } from 'rxjs';
import { tap, debounceTime, map, distinctUntilChanged, skip } from 'rxjs/operators';

//import { OptionsListComponent, OptionsListComponentState } from './options_list_component';
import {
  withSuspense,
  LazyReduxEmbeddableWrapper,
  ReduxEmbeddableWrapperPropsWithChildren,
} from '../../../../presentation_util/public';
//import { OptionsListEmbeddableInput, OPTIONS_LIST_CONTROL } from './types';
import { ControlsDataViewsService } from '../../services/data_views';
import { Embeddable, EmbeddableInput, IContainer } from '../../../../embeddable/public';
import { ControlsDataService } from '../../services/data';
import { DataView, DataViewField } from '../../../../data_views/public';
import { ControlInput, ControlOutput } from '../..';
import { pluginServices } from '../../services';

//import { TimeSlider } from './time_slider.component';
import { TimeSlider as TimeSliderComponent, TimeSliderSubjectState } from './time_slider';
import { TimeRange } from 'src/plugins/data/public';
import { timeSliderReducers } from './time_slider_reducers';

//interface TimesliderControlEmbeddableInput extends EmbeddableInput {
//  timerange: TimeRange;//
//}

export interface TimeSliderControlEmbeddableInput extends ControlInput {
  fieldName: string;
  dataViewId: string;
  value: [number, number];
}

const TimeSliderControlReduxWrapper = withSuspense<
  ReduxEmbeddableWrapperPropsWithChildren<TimeSliderControlEmbeddableInput>
>(LazyReduxEmbeddableWrapper);

const diffDataFetchProps = (current?: any, last?: any) => {
  if (!current || !last) return false;
  const { filters: currentFilters, ...currentWithoutFilters } = current;
  const { filters: lastFilters, ...lastWithoutFilters } = last;
  if (!deepEqual(currentWithoutFilters, lastWithoutFilters)) return false;
  if (!compareFilters(lastFilters ?? [], currentFilters ?? [])) return false;
  return true;
};

export class TimeSliderControlEmbeddable extends Embeddable<
  TimeSliderControlEmbeddableInput,
  ControlOutput
> {
  public readonly type = 'TIME_SLIDER';
  public deferEmbeddableLoad = true;

  private subscriptions: Subscription = new Subscription();
  private node?: HTMLElement;

  // Controls services
  private dataService: ControlsDataService;
  private dataViewsService: ControlsDataViewsService;

  // Internal data fetching state for this input control.
  //private typeaheadSubject: Subject<string> = new Subject<string>();
  private dataView?: DataView;
  //private searchString = '';

  // State to be passed down to component
  private componentState: any; //OptionsListComponentState;
  private componentStateSubject$ = new BehaviorSubject<TimeSliderSubjectState>({
    min: 0,
    max: 1,
  });

  constructor(input: TimeSliderControlEmbeddableInput, output: ControlOutput, parent?: IContainer) {
    super(input, output, parent); // get filters for initial output...

    console.log(input);

    // Destructure controls services
    ({ data: this.dataService, dataViews: this.dataViewsService } = pluginServices.getServices());

    this.componentState = { loading: true };
    this.updateComponentState(this.componentState);

    this.initialize();
  }

  private setupSubscriptions() {
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

    this.subscriptions.add(dataFetchPipe.subscribe(this.fetchAvailableTimerange));

    // build filters when value change
    this.subscriptions.add(
      this.getInput$()
        .pipe(
          debounceTime(400),
          distinctUntilChanged((a, b) => isEqual(a.value, b.value)),
          skip(1) // skip the first input update because initial filters will be built by initialize.
        )
        .subscribe(() => this.buildFilter())
    );
  }

  private buildFilter = async () => {
    console.log('building filter');
    const {
      fieldName,
      value: [min, max],
    } = this.getInput();
    // TODO: double check that this is correct
    if (
      [min, max, this.componentState.min, this.componentState.max].some(
        (value) => value === undefined
      )
    ) {
      this.updateOutput({ filters: [] });
      return;
    }
    const dataView = await this.getCurrentDataView();
    const field = dataView.getFieldByName(this.getInput().fieldName);

    //if (!field) throw fieldMissingError(fieldName);

    const rangeFilter = buildRangeFilter(
      field!,
      {
        gte: Math.max(Number(min), this.componentState.min!),
        lte: Math.min(Number(max), this.componentState.max!),
      },
      dataView
    );

    rangeFilter.meta.key = field?.name;

    console.log(rangeFilter);
    this.updateOutput({ filters: [rangeFilter] });
  };

  private updateComponentState(changes: Partial<TimeSliderSubjectState>) {
    this.componentState = {
      ...this.componentState,
      ...changes,
    };
    this.componentStateSubject$.next(this.componentState);
  }

  private getCurrentDataView = async (): Promise<DataView> => {
    const { dataViewId } = this.getInput();
    if (this.dataView && this.dataView.id === dataViewId) return this.dataView;
    this.dataView = await this.dataViewsService.get(dataViewId);
    if (this.dataView === undefined) {
      this.onFatalError(new Error('some error'));
    }
    this.updateOutput({ dataViews: [this.dataView] });
    return this.dataView;
  };

  private minMaxAgg = (field?: DataViewField) => {
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

    return {
      maxAgg: {
        max: aggBody,
      },
      minAgg: {
        min: aggBody,
      },
    };
  };

  private fetchAvailableTimerange = async () => {
    console.log('fetch available time frames');
    this.updateComponentState({ loading: true });

    const embeddableInput = this.getInput();
    const { ignoreParentSettings, fieldName, query, timeRange } = embeddableInput;
    let { filters = [] } = embeddableInput;
    const dataView = await this.getCurrentDataView();
    const field = dataView.getFieldByName(fieldName);

    if (!field) {
      this.updateComponentState({ loading: false });
      throw new Error('asdf');
      //throw fieldMissingError(fieldName);
    }

    if (timeRange) {
      const timeFilter = this.dataService.timefilter.createFilter(dataView, timeRange);
      if (timeFilter) {
        filters = filters.concat(timeFilter);
      }
    }

    const searchSource = await this.dataService.searchSource.create();
    searchSource.setField('size', 0);
    searchSource.setField('index', dataView);

    const aggs = this.minMaxAgg(field);
    searchSource.setField('aggs', aggs);

    searchSource.setField('filter', ignoreParentSettings?.ignoreFilters ? [] : filters);
    searchSource.setField('query', ignoreParentSettings?.ignoreQuery ? undefined : query);

    const resp = await searchSource.fetch$().toPromise();

    const min = get(resp, 'rawResponse.aggregations.minAgg.value', undefined);
    const max = get(resp, 'rawResponse.aggregations.maxAgg.value', undefined);

    this.updateComponentState({
      min: min === null ? undefined : min,
      max: max === null ? undefined : max,
      loading: false,
    });
  };

  private initialize() {
    this.fetchAvailableTimerange();
    this.setInitializationFinished();
    this.setupSubscriptions();
  }

  public destroy = () => {
    super.destroy();
    this.subscriptions.unsubscribe();
  };

  public reload = () => {
    this.fetchAvailableTimerange();
  };

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    ReactDOM.render(
      <TimeSliderControlReduxWrapper embeddable={this} reducers={timeSliderReducers}>
        <TimeSliderComponent componentStateSubject={this.componentStateSubject$} />
      </TimeSliderControlReduxWrapper>,
      node
    );
  };
}
