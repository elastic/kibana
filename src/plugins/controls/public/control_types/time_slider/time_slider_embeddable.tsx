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
  RangeFilterParams,
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
import { ControlsSettingsService } from '../../services/settings';
import { Embeddable, EmbeddableInput, IContainer } from '../../../../embeddable/public';
import { ControlsDataService } from '../../services/data';
import { DataView, DataViewField } from '../../../../data_views/public';
import { ControlInput, ControlOutput } from '../..';
import { ControlsServices, pluginServices } from '../../services';

import { TimeSlider as TimeSliderComponent, TimeSliderSubjectState } from './time_slider';
import { TimeRange } from 'src/plugins/data/public';
import { timeSliderReducers } from './time_slider_reducers';

export interface TimeSliderControlEmbeddableInput extends ControlInput {
  fieldName: string;
  dataViewId: string;
  value?: [number | undefined, number | undefined];
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

export const TimeSliderControlEmbeddableBuilder = ({
  fetchRange,
  getDataView,
  getDateFormat,
  getTimezone,
}: {
  fetchRange: ControlsDataService['fetchFieldRange'];
  getDataView: ControlsDataService['getDataView'];
  getDateFormat: ControlsSettingsService['getDateFormat'];
  getTimezone: ControlsSettingsService['getTimezone'];
}) => {
  class TimeSliderControlEmbeddable extends Embeddable<
    TimeSliderControlEmbeddableInput,
    ControlOutput
  > {
    public readonly type = 'TIME_SLIDER';
    public deferEmbeddableLoad = true;

    private subscriptions: Subscription = new Subscription();
    private node?: HTMLElement;

    // Internal data fetching state for this input control.
    private dataView?: DataView;

    private componentState: TimeSliderSubjectState;
    private componentStateSubject$ = new BehaviorSubject<TimeSliderSubjectState>({
      min: undefined,
      max: undefined,
      loading: false,
    });

    constructor(
      input: TimeSliderControlEmbeddableInput,
      output: ControlOutput,
      parent?: IContainer
    ) {
      super(input, output, parent); // get filters for initial output...

      this.componentState = { loading: true };
      this.updateComponentState(this.componentState);

      this.initialize();
    }

    private initialize() {
      //this.fetchAvailableTimerange();
      this.setInitializationFinished();
      this.setupSubscriptions();
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

      // build filters when value change or when component state range changes
      const availableRangePipe = this.componentStateSubject$.pipe(
        map((state) => ({
          min: state.min,
          max: state.max,
        })),
        distinctUntilChanged((a, b) => isEqual(a, b))
      );

      this.subscriptions.add(
        merge(
          this.getInput$().pipe(distinctUntilChanged((a, b) => isEqual(a.value, b.value))),
          availableRangePipe
        ).subscribe(() => this.buildFilter())
      );
    }

    private buildFilter = async () => {
      const { fieldName, value } = this.getInput();

      const min = value ? value[0] : undefined;
      const max = value ? value[1] : undefined;

      const dataView = await this.getCurrentDataView();
      const field = dataView.getFieldByName(fieldName);

      //if (!field) throw fieldMissingError(fieldName);

      // If we have a value or a range use the min/max of those, otherwise undefined
      let filterMin: number | undefined;
      let filterMax: number | undefined;

      if (min !== undefined || this.componentState.min !== undefined) {
        filterMin = Math.max(min || 0, this.componentState.min || 0);
      }

      if (max || this.componentState.max) {
        filterMax = Math.min(
          max || Number.MAX_SAFE_INTEGER,
          this.componentState.max || Number.MAX_SAFE_INTEGER
        );
      }

      const range: RangeFilterParams = {};
      if (filterMin !== undefined) {
        range.gte = filterMin;
      }
      if (filterMax !== undefined) {
        range.lte = filterMax;
      }

      const rangeFilter = buildRangeFilter(field!, range, dataView);
      rangeFilter.meta.key = field?.name;

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
      this.dataView = await getDataView(dataViewId);
      if (this.dataView === undefined) {
        this.onFatalError(new Error('some error'));
      }
      this.updateOutput({ dataViews: [this.dataView] });
      return this.dataView;
    };

    private fetchAvailableTimerange = async () => {
      this.updateComponentState({ loading: true });

      const { fieldName, ...input } = this.getInput();
      const dataView = await this.getCurrentDataView();

      try {
        const { min, max } = await fetchRange(dataView, fieldName, input);

        this.updateComponentState({
          min: min === null ? undefined : min,
          max: max === null ? undefined : max,
          loading: false,
        });
      } catch (e) {
        this.updateComponentState({ loading: false });
      }
    };

    public getComponentState$ = () => {
      return this.componentStateSubject$;
    };

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
          <TimeSliderComponent
            componentStateSubject={this.componentStateSubject$}
            timezone={getTimezone()}
            dateFormat={getDateFormat()}
          />
        </TimeSliderControlReduxWrapper>,
        node
      );
    };
  }

  return TimeSliderControlEmbeddable;
};
