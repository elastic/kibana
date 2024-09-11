/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { get, isEmpty, isEqual } from 'lodash';
import React, { createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import { batch } from 'react-redux';
import { lastValueFrom, Subscription, switchMap } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs';

import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import {
  buildRangeFilter,
  compareFilters,
  COMPARE_ALL_OPTIONS,
  Filter,
  RangeFilterParams,
} from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import { ControlGroupContainer, RANGE_SLIDER_CONTROL } from '../..';
import { ControlFilterOutput } from '../../control_group/types';
import { pluginServices } from '../../services';
import { ControlsDataService } from '../../services/data/types';
import { ControlsDataViewsService } from '../../services/data_views/types';
import { CanClearSelections, ControlInput, ControlOutput } from '../../types';
import { RangeSliderControl } from '../components/range_slider_control';
import { getDefaultComponentState, rangeSliderReducers } from '../range_slider_reducers';
import { RangeSliderReduxState } from '../types';
import { RangeSliderEmbeddableInput } from '..';

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

export class RangeSliderEmbeddable
  extends Embeddable<RangeSliderEmbeddableInput, ControlOutput>
  implements CanClearSelections
{
  public readonly type = RANGE_SLIDER_CONTROL;
  public deferEmbeddableLoad = true;
  public parent: ControlGroupContainer;

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
    reduxToolsPackage: ReduxToolsPackage,
    input: RangeSliderEmbeddableInput,
    output: ControlOutput,
    parent?: IContainer
  ) {
    super(input, output, parent); // get filters for initial output...
    this.parent = parent as ControlGroupContainer;

    // Destructure controls services
    ({ data: this.dataService, dataViews: this.dataViewsService } = pluginServices.getServices());

    const reduxEmbeddableTools = reduxToolsPackage.createReduxEmbeddableTools<
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
    const [initialMin, initialMax] = this.getInput().value ?? [];
    if (!isEmpty(initialMin) || !isEmpty(initialMax)) {
      const { filters: rangeFilter } = await this.buildFilter();
      this.dispatch.publishFilters(rangeFilter);
    }
    this.setInitializationFinished();

    this.runRangeSliderQuery()
      .then(async () => {
        this.setupSubscriptions();
      })
      .catch((e) => this.onLoadingError(e.message));
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
      distinctUntilChanged(diffDataFetchProps)
    );

    const valueChangePipe = this.getInput$().pipe(
      distinctUntilChanged((a, b) => isEqual(a.value ?? ['', ''], b.value ?? ['', '']))
    );

    this.subscriptions.add(
      dataFetchPipe
        .pipe(
          switchMap(async () => {
            try {
              this.dispatch.setLoading(true);
              await this.runRangeSliderQuery();
              await this.runValidations();
              this.dispatch.setLoading(false);
            } catch (e) {
              this.onLoadingError(e.message);
            }
          })
        )
        .subscribe()
    );

    // publish filters when value changes
    this.subscriptions.add(
      valueChangePipe
        .pipe(
          switchMap(async () => {
            try {
              this.dispatch.setLoading(true);
              const { filters: rangeFilter } = await this.buildFilter();
              this.dispatch.publishFilters(rangeFilter);
              await this.runValidations();
              this.dispatch.setLoading(false);
            } catch (e) {
              this.onLoadingError(e.message);
            }
          })
        )
        .subscribe()
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
        this.dispatch.setDataViewId(this.dataView.id);
      } catch (e) {
        this.onLoadingError(e.message);
      }
    }

    if (this.dataView && (!this.field || this.field.name !== fieldName)) {
      this.field = this.dataView.getFieldByName(fieldName);
      if (this.field) {
        this.dispatch.setField(this.field?.toSpec());
      } else {
        this.onLoadingError(
          i18n.translate('controls.rangeSlider.errors.fieldNotFound', {
            defaultMessage: 'Could not locate field: {fieldName}',
            values: { fieldName },
          })
        );
      }
    }

    return { dataView: this.dataView, field: this.field };
  };

  private runRangeSliderQuery = async () => {
    const { dataView, field } = await this.getCurrentDataViewAndField();
    if (!dataView || !field) return;

    const { min, max } = await this.fetchMinMax({
      dataView,
      field,
    });

    batch(() => {
      this.dispatch.setMinMax({ min, max });
      this.dispatch.setDataViewId(dataView.id);
      this.dispatch.setErrorMessage(undefined);
    });
  };

  private fetchMinMax = async ({
    dataView,
    field,
  }: {
    dataView: DataView;
    field: DataViewField;
  }): Promise<{ min?: number; max?: number }> => {
    const { query } = this.getInput();
    const searchSource = await this.dataService.searchSource.create();
    searchSource.setField('size', 0);
    searchSource.setField('index', dataView);
    searchSource.setField('filter', this.getGlobalFilters(dataView));

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
    const min = get(resp, 'rawResponse.aggregations.minAgg.value');
    const max = get(resp, 'rawResponse.aggregations.maxAgg.value');

    return { min, max };
  };

  public selectionsToFilters = async (
    input: Partial<RangeSliderEmbeddableInput>
  ): Promise<ControlFilterOutput> => {
    const { value } = input;
    const [selectedMin, selectedMax] = value ?? ['', ''];
    const [min, max] = [selectedMin, selectedMax].map(parseFloat);

    const { dataView, field } = await this.getCurrentDataViewAndField();
    if (!dataView || !field || (isEmpty(selectedMin) && isEmpty(selectedMax))) {
      return { filters: [] };
    }

    const params = {} as RangeFilterParams;
    if (selectedMin) {
      params.gte = min;
    }
    if (selectedMax) {
      params.lte = max;
    }

    const rangeFilter = buildRangeFilter(field, params, dataView);
    rangeFilter.meta.key = field?.name;
    rangeFilter.meta.type = 'range';
    rangeFilter.meta.params = params;

    return { filters: [rangeFilter] };
  };

  private buildFilter = async () => {
    const {
      explicitInput: { value },
    } = this.getState();
    return await this.selectionsToFilters({ value });
  };

  private onLoadingError(errorMessage: string) {
    batch(() => {
      this.dispatch.setLoading(false);
      this.dispatch.publishFilters([]);
      this.dispatch.setErrorMessage(errorMessage);
    });
  }

  private getGlobalFilters = (dataView: DataView) => {
    const {
      filters: globalFilters,
      ignoreParentSettings,
      timeRange: globalTimeRange,
      timeslice,
    } = this.getInput();

    const filters: Filter[] = [];

    if (!ignoreParentSettings?.ignoreFilters && globalFilters) {
      filters.push(...globalFilters);
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
      if (timeFilter) filters.push(timeFilter);
    }

    return filters;
  };

  private runValidations = async () => {
    const { dataView } = await this.getCurrentDataViewAndField();
    if (!dataView) return;
    // Check if new range filter results in no data
    const { ignoreParentSettings, query } = this.getInput();
    if (ignoreParentSettings?.ignoreValidations) {
      this.dispatch.setIsInvalid(false);
    } else {
      const searchSource = await this.dataService.searchSource.create();

      const { filters: rangeFilters = [] } = this.getOutput();
      const filters = this.getGlobalFilters(dataView).concat(rangeFilters);

      searchSource.setField('size', 0);
      searchSource.setField('index', dataView);
      searchSource.setField('filter', filters);
      if (query) {
        searchSource.setField('query', query);
      }

      const resp = await lastValueFrom(searchSource.fetch$());
      const total = resp?.rawResponse?.hits?.total;

      const docCount = typeof total === 'number' ? total : total?.value;

      const {
        explicitInput: { value },
      } = this.getState();
      this.reportInvalidSelections(
        !value || (value[0] === '' && value[1] === '') ? false : !docCount // don't set the range slider invalid if it has no selections
      );
    }
  };

  private reportInvalidSelections = (hasInvalidSelections: boolean) => {
    this.dispatch.setIsInvalid(hasInvalidSelections);
    this.parent?.reportInvalidSelections({
      id: this.id,
      hasInvalidSelections,
    });
  };

  public clearSelections() {
    this.dispatch.setSelectedRange(['', '']);
  }

  public reload = async () => {
    this.dispatch.setLoading(true);
    try {
      await this.runRangeSliderQuery();
      this.dispatch.setLoading(false);
    } catch (e) {
      this.onLoadingError(e.message);
    }
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
      <KibanaRenderContextProvider {...pluginServices.getServices().core}>
        <ControlsServicesProvider>
          <RangeSliderControlContext.Provider value={this}>
            <RangeSliderControl />
          </RangeSliderControlContext.Provider>
        </ControlsServicesProvider>
      </KibanaRenderContextProvider>,
      node
    );
  };

  public isChained() {
    return true;
  }
}
