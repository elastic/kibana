/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { Control, noValuesDisableMsg, noIndexPatternMsg } from './control';
import { RangeFilterManager } from './filter_manager/range_filter_manager';
import { createSearchSource } from './create_search_source';
import { i18n } from '@kbn/i18n';
import { start as data } from '../../../../core_plugins/data/public/legacy';

const minMaxAgg = field => {
  const aggBody = {};
  if (field.scripted) {
    aggBody.script = {
      source: field.script,
      lang: field.lang,
    };
  } else {
    aggBody.field = field.name;
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

class RangeControl extends Control {
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
    const searchSource = createSearchSource(
      this.kbnApi,
      null,
      indexPattern,
      aggs,
      this.useTimeFilter
    );
    this.abortController.signal.addEventListener('abort', () => searchSource.cancelQueued());

    let resp;
    try {
      resp = await searchSource.fetch();
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

export async function rangeControlFactory(controlParams, kbnApi, useTimeFilter) {
  let indexPattern;
  try {
    indexPattern = await data.indexPatterns.indexPatterns.get(controlParams.indexPattern);
  } catch (err) {
    // ignore not found error and return control so it can be displayed in disabled state.
  }
  return new RangeControl(
    controlParams,
    new RangeFilterManager(
      controlParams.id,
      controlParams.fieldName,
      indexPattern,
      data.filter.filterManager
    ),
    kbnApi,
    useTimeFilter
  );
}
