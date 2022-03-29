/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compareFilters, buildRangeFilter, RangeFilterParams } from '@kbn/es-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { isEqual } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { merge, Subscription, BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged, skip, take, mergeMap } from 'rxjs/operators';

import { TimeSliderControlEmbeddableInput } from '../../../common/control_types/time_slider/types';

import {
  withSuspense,
  LazyReduxEmbeddableWrapper,
  ReduxEmbeddableWrapperPropsWithChildren,
} from '../../../../presentation_util/public';

import { TIME_SLIDER_CONTROL } from '../../';
import { ControlsSettingsService } from '../../services/settings';
import { Embeddable, IContainer } from '../../../../embeddable/public';
import { ControlsDataService } from '../../services/data';
import { DataView } from '../../../../data_views/public';
import { ControlOutput } from '../..';
import { pluginServices } from '../../services';

import { TimeSlider as TimeSliderComponent, TimeSliderSubjectState } from './time_slider';
import { timeSliderReducers } from './time_slider_reducers';

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
  public readonly type = TIME_SLIDER_CONTROL;
  public deferEmbeddableLoad = true;

  private subscriptions: Subscription = new Subscription();
  private node?: HTMLElement;

  // Internal data fetching state for this input control.
  private dataView?: DataView;

  private componentState: TimeSliderSubjectState;
  private componentStateSubject$ = new BehaviorSubject<TimeSliderSubjectState>({
    range: undefined,
    loading: false,
  });

  // Internal state subject will let us batch updates to the externally accessible state subject
  private internalComponentStateSubject$ = new BehaviorSubject<TimeSliderSubjectState>({
    range: undefined,
    loading: false,
  });

  private internalOutput: ControlOutput;

  private fetchRange$: ControlsDataService['fetchFieldRange$'];
  private getDataView$: ControlsDataService['getDataView$'];
  private getDateFormat: ControlsSettingsService['getDateFormat'];
  private getTimezone: ControlsSettingsService['getTimezone'];

  constructor(input: TimeSliderControlEmbeddableInput, output: ControlOutput, parent?: IContainer) {
    super(input, output, parent); // get filters for initial output...

    const {
      data: { fetchFieldRange$, getDataView$ },
      settings: { getDateFormat, getTimezone },
    } = pluginServices.getServices();
    this.fetchRange$ = fetchFieldRange$;
    this.getDataView$ = getDataView$;
    this.getDateFormat = getDateFormat;
    this.getTimezone = getTimezone;

    this.componentState = { loading: true };
    this.updateComponentState(this.componentState, true);

    this.internalOutput = {};

    this.initialize();
  }

  private initialize() {
    // If value is undefined, then we can be finished with initialization because we're not going to output a filter
    if (this.getInput().value === undefined) {
      this.setInitializationFinished();
    }

    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // We need to fetch data when any of these values change
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

    // When data fetch pipe emits, we start the fetch
    this.subscriptions.add(dataFetchPipe.subscribe(this.fetchAvailableTimerange));

    const availableRangePipe = this.internalComponentStateSubject$.pipe(
      map((state) => (state.range ? { min: state.range.min, max: state.range.max } : {})),
      distinctUntilChanged((a, b) => isEqual(a, b))
    );

    this.subscriptions.add(
      merge(
        this.getInput$().pipe(
          skip(1), // Skip the first input value
          distinctUntilChanged((a, b) => isEqual(a.value, b.value))
        ),
        availableRangePipe.pipe(skip(1))
      ).subscribe(() => {
        this.setInitializationFinished();
        this.buildFilter();

        this.componentStateSubject$.next(this.componentState);
      })
    );
  }

  private buildFilter = () => {
    const { fieldName, value, ignoreParentSettings } = this.getInput();

    const min = value ? value[0] : null;
    const max = value ? value[1] : null;
    const hasRange =
      this.componentState.range!.max !== undefined && this.componentState.range!.min !== undefined;

    this.getCurrentDataView$().subscribe((dataView) => {
      const range: RangeFilterParams = {};
      let filterMin: number | undefined;
      let filterMax: number | undefined;
      const field = dataView.getFieldByName(fieldName);

      if (ignoreParentSettings?.ignoreValidations) {
        if (min !== null) {
          range.gte = min;
        }

        if (max !== null) {
          range.lte = max;
        }
      } else {
        // If we have a value or a range use the min/max of those, otherwise undefined
        if (min !== null || this.componentState.range!.min !== undefined) {
          filterMin = Math.max(min || 0, this.componentState.range!.min || 0);
        }

        if (max || this.componentState.range!.max) {
          filterMax = Math.min(
            max || Number.MAX_SAFE_INTEGER,
            this.componentState.range!.max || Number.MAX_SAFE_INTEGER
          );
        }

        // Last check, if the value is completely outside the range then we will just default to the range
        if (
          hasRange &&
          ((min !== null && min > this.componentState.range!.max!) ||
            (max !== null && max < this.componentState.range!.min!))
        ) {
          filterMin = this.componentState.range!.min;
          filterMax = this.componentState.range!.max;
        }

        if (hasRange && filterMin !== undefined) {
          range.gte = filterMin;
        }
        if (hasRange && filterMax !== undefined) {
          range.lte = filterMax;
        }
      }

      if (range.lte !== undefined || range.gte !== undefined) {
        const rangeFilter = buildRangeFilter(field!, range, dataView);
        rangeFilter.meta.key = field?.name;

        this.updateInternalOutput({ filters: [rangeFilter] }, true);
        this.updateComponentState({ loading: false });
      } else {
        this.updateInternalOutput({ filters: undefined, dataViews: [dataView] }, true);
        this.updateComponentState({ loading: false });
      }
    });
  };

  private updateComponentState(changes: Partial<TimeSliderSubjectState>, publish = false) {
    this.componentState = {
      ...this.componentState,
      ...changes,
    };

    this.internalComponentStateSubject$.next(this.componentState);

    if (publish) {
      this.componentStateSubject$.next(this.componentState);
    }
  }

  private updateInternalOutput(changes: Partial<ControlOutput>, publish = false) {
    this.internalOutput = {
      ...this.internalOutput,
      ...changes,
    };

    if (publish) {
      this.updateOutput(this.internalOutput);
    }
  }

  private getCurrentDataView$ = () => {
    const { dataViewId } = this.getInput();
    if (this.dataView && this.dataView.id === dataViewId)
      return new Observable<DataView>((subscriber) => {
        subscriber.next(this.dataView);
        subscriber.complete();
      });

    return this.getDataView$(dataViewId);
  };

  private fetchAvailableTimerange = () => {
    this.updateComponentState({ loading: true }, true);
    this.updateInternalOutput({ loading: true }, true);

    const { fieldName, ignoreParentSettings, query, filters, timeRange, ...input } =
      this.getInput();

    const inputForFetch = {
      ...input,
      ...(ignoreParentSettings?.ignoreQuery ? {} : { query }),
      ...(ignoreParentSettings?.ignoreFilters ? {} : { filters }),
      ...(ignoreParentSettings?.ignoreTimerange ? {} : { timeRange }),
    };

    try {
      this.getCurrentDataView$()
        .pipe(
          mergeMap((dataView) => this.fetchRange$(dataView, fieldName, inputForFetch)),
          take(1)
        )
        .subscribe(({ min, max }) => {
          this.updateInternalOutput({ loading: false });
          this.updateComponentState({
            range: {
              min: min === null ? undefined : min,
              max: max === null ? undefined : max,
            },
            loading: false,
          });
        });
    } catch (e) {
      this.updateComponentState({ loading: false }, true);
      this.updateInternalOutput({ loading: false }, true);
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
          timezone={this.getTimezone()}
          dateFormat={this.getDateFormat()}
          fieldName={this.getInput().fieldName}
        />
      </TimeSliderControlReduxWrapper>,
      node
    );
  };
}
