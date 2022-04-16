/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

import { TimefilterContract, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { Control, noValuesDisableMsg, noIndexPatternMsg } from './control';
import { RangeFilterManager } from './filter_manager/range_filter_manager';
import { createSearchSource } from './create_search_source';
import { ControlParams } from '../editor_utils';
import { InputControlVisDependencies } from '../plugin';

const minMaxAgg = (field?: DataViewField) => {
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

export class RangeControl extends Control<RangeFilterManager> {
  private searchSource: DataPublicPluginStart['search']['searchSource'];

  timefilter: TimefilterContract;
  abortController: any;
  min: any;
  max: any;

  constructor(
    controlParams: ControlParams,
    filterManager: RangeFilterManager,
    useTimeFilter: boolean,
    searchSource: DataPublicPluginStart['search']['searchSource'],
    deps: InputControlVisDependencies
  ) {
    super(controlParams, filterManager, useTimeFilter);
    this.timefilter = deps.data.query.timefilter.timefilter;
    this.searchSource = searchSource;
  }

  async fetch() {
    // Abort any in-progress fetch
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const indexPattern = this.filterManager.getIndexPattern();
    if (!indexPattern) {
      this.disable(noIndexPatternMsg(this.controlParams.indexPattern));
      return;
    }

    const fieldName = this.filterManager.fieldName;
    const aggs = minMaxAgg(indexPattern.fields.getByName(fieldName));
    const searchSource = await createSearchSource(
      this.searchSource,
      null,
      indexPattern,
      aggs,
      this.useTimeFilter,
      [],
      this.timefilter
    );
    const abortSignal = this.abortController.signal;

    let resp;
    try {
      resp = await searchSource.fetch({ abortSignal });
    } catch (error) {
      // If the fetch was aborted then no need to surface this error in the UI
      if (error.name === 'AbortError') return;
      this.disable(
        i18n.translate('inputControl.rangeControl.unableToFetchTooltip', {
          defaultMessage: 'Unable to fetch range min and max, error: {errorMessage}',
          values: { errorMessage: error.message },
        })
      );
      return;
    }

    const min = _.get(resp, 'aggregations.minAgg.value', null);
    const max = _.get(resp, 'aggregations.maxAgg.value', null);

    if (min === null || max === null) {
      this.disable(noValuesDisableMsg(fieldName, indexPattern.title));
      return;
    }

    this.min = min;
    this.max = max;
    this.enable = true;
  }

  destroy() {
    if (this.abortController) this.abortController.abort();
  }
}

export async function rangeControlFactory(
  controlParams: ControlParams,
  useTimeFilter: boolean,
  deps: InputControlVisDependencies
): Promise<RangeControl> {
  const [, { data: dataPluginStart }] = await deps.core.getStartServices();

  const rangeControl = new RangeControl(
    controlParams,
    new RangeFilterManager(
      controlParams.id,
      controlParams.fieldName,
      controlParams.indexPattern,
      dataPluginStart.indexPatterns,
      deps.data.query.filterManager
    ),
    useTimeFilter,
    dataPluginStart.search.searchSource,
    deps
  );
  await rangeControl.filterManager.init();
  return rangeControl;
}
