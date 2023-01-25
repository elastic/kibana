/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import { isEmpty } from 'lodash';
import { batch } from 'react-redux';
import { get, isEqual } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { Subscription, lastValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, skip, map } from 'rxjs/operators';

import {
  compareFilters,
  buildRangeFilter,
  COMPARE_ALL_OPTIONS,
  RangeFilterParams,
  Filter,
  Query,
} from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { ReduxEmbeddableTools, ReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public';

import {
  ControlInput,
  ControlOutput,
  RangeSliderEmbeddableInput,
  RANGE_SLIDER_CONTROL,
} from '../..';
import { pluginServices } from '../../services';
import { RangeSliderReduxState } from '../types';
import { ControlsDataService } from '../../services/data/types';
import { RangeSliderControl } from '../components/range_slider_control';
import { ControlsDataViewsService } from '../../services/data_views/types';
import { getDefaultComponentState, rangeSliderReducers } from '../range_slider_reducers';

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

export const RangeSliderControlContext = createContext<RangeSliderEmbeddable | null>(null);
export const useRangeSlider = (): RangeSliderEmbeddable => {
  const rangeSlider = useContext<RangeSliderEmbeddable | null>(RangeSliderControlContext);
  if (rangeSlider == null) {
    throw new Error('useRangeSlider must be used inside RangeSliderControlContext.');
  }
  return rangeSlider!;
};

type RangeSliderReduxEmbeddableTools = ReduxEmbeddableTools<
  RangeSliderReduxState,
  typeof rangeSliderReducers
>;

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

  // state management
  public select: RangeSliderReduxEmbeddableTools['select'];
  public getState: RangeSliderReduxEmbeddableTools['getState'];
  public dispatch: RangeSliderReduxEmbeddableTools['dispatch'];
  public onStateChange: RangeSliderReduxEmbeddableTools['onStateChange'];

  private cleanupStateTools: () => void;

  constructor(
    reduxEmbeddablePackage: ReduxEmbeddablePackage,
    input: RangeSliderEmbeddableInput,
    output: ControlOutput,
    parent?: IContainer
  ) {
    super(input, output, parent); // get filters for initial output...

    // Destructure controls services
    ({ data: this.dataService, dataViews: this.dataViewsService } = pluginServices.getServices());

    const reduxEmbeddableTools = reduxEmbeddablePackage.createTools<
      RangeSliderReduxState,
      typeof rangeSliderReducers
    >({
      embeddable: this,
      reducers: rangeSliderReducers,
      initialComponentState: getDefaultComponentState(),
    });
    this.select = reduxEmbeddableTools.select;
    this.getState = reduxEmbeddableTools.getState;
    this.dispatch = reduxEmbeddableTools.dispatch;
    this.onStateChange = reduxEmbeddableTools.onStateChange;
    this.cleanupStateTools = reduxEmbeddableTools.cleanup;

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
        timeslice: newInput.timeslice,
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
    const {
      explicitInput: { dataViewId, fieldName },
    } = this.getState();

    if (!this.dataView || this.dataView.id !== dataViewId) {
      try {
        this.dataView = await this.dataViewsService.get(dataViewId);

        if (!this.dataView) {
          throw new Error(
            i18n.translate('controls.rangeSlider.errors.dataViewNotFound', {
              defaultMessage: 'Could not locate data view: {dataViewId}',
              values: { dataViewId },
            })
          );
        }

        this.dispatch.setDataViewId(this.dataView.id);
      } catch (e) {
        this.onFatalError(e);
      }
    }

    if (!this.field || this.field.name !== fieldName) {
      this.field = this.dataView?.getFieldByName(fieldName);
      if (this.field === undefined) {
        this.onFatalError(
          new Error(
            i18n.translate('controls.rangeSlider.errors.fieldNotFound', {
              defaultMessage: 'Could not locate field: {fieldName}',
              values: { fieldName },
            })
          )
        );
      }

      this.dispatch.setField(this.field?.toSpec());
    }

    return { dataView: this.dataView, field: this.field! };
  };

  private runRangeSliderQuery = async () => {
    this.dispatch.setLoading(true);
    const { dataView, field } = await this.getCurrentDataViewAndField();
    if (!dataView || !field) return;

    const embeddableInput = this.getInput();
    const {
      ignoreParentSettings,
      fieldName,
      query,
      timeRange: globalTimeRange,
      timeslice,
    } = embeddableInput;
    let { filters = [] } = embeddableInput;

    if (!field) {
      batch(() => {
        this.dispatch.setLoading(false);
        this.dispatch.publishFilters([]);
      });
      throw fieldMissingError(fieldName);
    }

    if (ignoreParentSettings?.ignoreFilters) {
      filters = [];
    }

    const timeRange =
      timeslice !== undefined
        ? {
            from: new Date(timeslice[0]).toISOString(),
            to: new Date(timeslice[1]).toISOString(),
            mode: 'absolute' as 'absolute',
          }
        : globalTimeRange;
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

    this.dispatch.setMinMax({
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
    query?: Query;
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
      componentState: { min: availableMin, max: availableMax },
      explicitInput: {
        query,
        timeRange,
        filters = [],
        ignoreParentSettings,
        value: [selectedMin, selectedMax] = ['', ''],
      },
    } = this.getState();

    const hasData = !isEmpty(availableMin) && !isEmpty(availableMax);
    const hasLowerSelection = !isEmpty(selectedMin);
    const hasUpperSelection = !isEmpty(selectedMax);
    const hasEitherSelection = hasLowerSelection || hasUpperSelection;

    const { dataView, field } = await this.getCurrentDataViewAndField();
    if (!dataView || !field) return;

    if (!hasData || !hasEitherSelection) {
      batch(() => {
        this.dispatch.setLoading(false);
        this.dispatch.setIsInvalid(!ignoreParentSettings?.ignoreValidations && hasEitherSelection);
        this.dispatch.setDataViewId(dataView.id);
        this.dispatch.publishFilters([]);
      });
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
        batch(() => {
          this.dispatch.setLoading(false);
          this.dispatch.setIsInvalid(true);
          this.dispatch.setDataViewId(dataView.id);
          this.dispatch.publishFilters([]);
        });
        return;
      }
    }

    batch(() => {
      this.dispatch.setLoading(false);
      this.dispatch.setIsInvalid(false);
      this.dispatch.setDataViewId(dataView.id);
      this.dispatch.publishFilters([rangeFilter]);
    });
  };

  public reload = () => {
    this.runRangeSliderQuery();
  };

  public destroy = () => {
    super.destroy();
    this.cleanupStateTools();
    this.subscriptions.unsubscribe();
  };

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    const ControlsServicesProvider = pluginServices.getContextProvider();
    ReactDOM.render(
      <KibanaThemeProvider theme$={pluginServices.getServices().theme.theme$}>
        <ControlsServicesProvider>
          <RangeSliderControlContext.Provider value={this}>
            <RangeSliderControl />
          </RangeSliderControlContext.Provider>
        </ControlsServicesProvider>
      </KibanaThemeProvider>,
      node
    );
  };

  public isChained() {
    return true;
  }
}
