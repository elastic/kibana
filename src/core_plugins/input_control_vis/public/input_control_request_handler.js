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
import { timefilter } from 'ui/timefilter';
import { buildRangeFilter } from 'ui/filter_manager/lib/range';
import { createPhraseFilter } from './control/filter_manager/phrase_filter_manager';
import { noValuesDisableMsg, noIndexPatternMsg } from './control/control';

function getEscapedQuery(query = '') {
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
  return query.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);
}

const termsAgg = ({ field, size, direction, query }) => {
  const terms = {
    order: {
      _count: direction
    }
  };

  if (size) {
    terms.size = size < 1 ? 1 : size;
  }

  if (field.scripted) {
    terms.script = {
      inline: field.script,
      lang: field.lang
    };
    terms.valueType = field.type === 'number' ? 'float' : field.type;
  } else {
    terms.field = field.name;
  }

  if (query) {
    terms.include = `.*${getEscapedQuery(query)}.*`;
  }

  return {
    'termsAgg': {
      'terms': terms
    }
  };
};

const minMaxAgg = (field) => {
  const aggBody = {};
  if (field.scripted) {
    aggBody.script = {
      inline: field.script,
      lang: field.lang
    };
  } else {
    aggBody.field = field.name;
  }
  return {
    maxAgg: {
      max: aggBody
    },
    minAgg: {
      min: aggBody
    }
  };
};

export const inputControlRequestHandler = async (vis, { searchSource, timeRange, uiState }) => {
  const controlParams = vis.params;
  if (!searchSource.cache) {
    searchSource.cache = {};
  }

  const initialSearchSourceState = {
    timeout: '1s',
    terminate_after: 100000
  };

  const createAncestorFilters = (controls, indexPattern, control) => {
    let filters = [];
    const parentControl = controls.find(c => c.id === control.parent);
    const parentValues = uiState.get(`value-${control.parent}`, null);
    if (parentValues) {
      const field = indexPattern.fields.byName[parentControl.fieldName];
      if (parentControl.type === 'list') {
        filters.push(createPhraseFilter(parentValues, indexPattern, parentControl.fieldName));
      } else {
        const rangeValue = {
          gte: parentValues.min,
          lte: parentValues.max
        };
        filters.push(buildRangeFilter(field, rangeValue, indexPattern));
      }

    }
    if (parentControl && parentControl.parent) {
      filters = [
        ...filters,
        ...createAncestorFilters(controls, indexPattern, parentControl)
      ];
    }
    return filters;
  };

  // for each input control (maybe we can batch the requests ?)
  return await Promise.all(vis.params.controls.map(async control => {
    const controlData = {
      enable: true,
      disableReason: '',
    };

    let indexPattern;
    try {
      indexPattern = await vis.API.indexPatterns.get(control.indexPattern);
    } catch (err) {
      controlData.enable = false;
      controlData.disableReason = noIndexPatternMsg(control.indexPattern);
      return controlData;
    }

    let ancestorFilters = [];
    if (control.parent) {
      const parentValue = uiState.get(`value-${control.parent}`, []);
      if (!parentValue.length) {
        const parent = vis.params.controls.find(ctrl => ctrl.id === control.parent);
        controlData.enable = false;
        controlData.disableReason = `Disabled until '${parent.label}' is set.`;
        return controlData;
      }

      ancestorFilters = createAncestorFilters(vis.params.controls, indexPattern, control);
    }

    const query =  uiState.get(`query-${control.id}`);

    const field = indexPattern.fields.byName[control.fieldName];
    let aggs;
    if (control.type === 'list') {
      // dynamic options are only allowed on String fields but the setting defaults to true so it could
      // be enabled for non-string fields (since UI input is hidden for non-string fields).
      // If field is not string, then disable dynamic options.
      const fieldIsString = field && field.type === 'string';
      const dynamicOptions = control.options.dynamicOptions && fieldIsString;

      aggs = termsAgg({
        field,
        size: dynamicOptions ? null : _.get(control.options, 'size', 5),
        direction: 'desc',
        query: dynamicOptions ? query : null
      });
    } else {
      minMaxAgg(field);
    }

    const requestSearchSource = searchSource.create(initialSearchSourceState);

    requestSearchSource.setField('filter', () => {
      const activeFilters = [...ancestorFilters];
      if (controlParams.useTimeFilter) {
        activeFilters.push(timefilter.createFilter(indexPattern, timeRange));
      }
      return activeFilters;
    });
    requestSearchSource.setField('size', 0);
    requestSearchSource.setField('index', indexPattern);
    requestSearchSource.setField('aggs', aggs);

    if (!searchSource.cache[control.id]) {
      searchSource.cache[control.id] = {};
    }

    let resp;
    try {
      const currentRequest = await requestSearchSource.getSearchRequestBody();
      if (_.isEqual(searchSource.cache[control.id].lastRequest, currentRequest)) {
        return searchSource.cache[control.id].controlData;
      }
      searchSource.cache[control.id].lastRequest = currentRequest;
      resp = await requestSearchSource.fetch();
    } catch(error) {
      controlData.enable = false;
      controlData.disableReason = `Unable to fetch terms, error: ${error.message}`;
      return controlData;
    }

    if (control.type === 'list') {

      const selectOptions = _.get(resp, 'aggregations.termsAgg.buckets', []).map((bucket) => {
        return { label: field.format.convert(bucket.key), value: bucket.key.toString() };
      }).sort((a, b) => {
        return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
      });

      if (selectOptions.length === 0 && !query) {
        controlData.enable = false;
        controlData.disableReason = noValuesDisableMsg(control.fieldName, indexPattern.title);
        searchSource.cache[control.id].controlData = controlData;
        return controlData;
      }

      controlData.data = selectOptions;
    } else {
      let minMaxReturnedFromAggregation = true;
      let min = _.get(resp, 'aggregations.minAgg.value');
      let max = _.get(resp, 'aggregations.maxAgg.value');
      if (min === null || max === null) {
        min = 0;
        max = 1;
        minMaxReturnedFromAggregation = false;
      }

      if (!minMaxReturnedFromAggregation) {
        controlData.enable = false;
      } else {
        controlData.data = {
          unsetValue: { min: min, max: max },
          min: min,
          max: max,
        };
      }
    }
    searchSource.cache[control.id].controlData = controlData;
    return controlData;
  }));
};
