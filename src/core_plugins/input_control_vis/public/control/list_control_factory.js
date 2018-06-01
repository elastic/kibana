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
import {
  Control,
  noValuesDisableMsg,
  noIndexPatternMsg,
} from './control';
import { PhraseFilterManager } from './filter_manager/phrase_filter_manager';
import { createSearchSource } from './create_search_source';

const termsAgg = (field, size, direction) => {
  if (size < 1) {
    size = 1;
  }
  const terms = {
    size: size,
    order: {
      _count: direction
    }
  };
  if (field.scripted) {
    terms.script = {
      inline: field.script,
      lang: field.lang
    };
    terms.valueType = field.type === 'number' ? 'float' : field.type;
  } else {
    terms.field = field.name;
  }
  return {
    'termsAgg': {
      'terms': terms
    }
  };
};

class ListControl extends Control {

  async fetch() {
    const indexPattern = this.filterManager.getIndexPattern();
    if (!indexPattern) {
      this.disable(noIndexPatternMsg(this.controlParams.indexPattern));
      return;
    }

    let ancestorFilters;
    if (this.hasAncestors()) {
      if (this.hasUnsetAncestor()) {
        this.disable(`Disabled until '${this.ancestors[0].label}' is set.`);
        return;
      }

      const ancestorValues = this.getAncestorValues();
      if (_.isEqual(ancestorValues, this.lastAncestorValues)) {
        // short circuit to avoid fetching options list for same ancestor values
        return;
      }
      this.lastAncestorValues = ancestorValues;

      ancestorFilters = this.getAncestorFilters();
    }

    const fieldName = this.filterManager.fieldName;
    const initialSearchSourceState = {
      timeout: '1s',
      terminate_after: 100000
    };
    const aggs = termsAgg(
      indexPattern.fields.byName[fieldName],
      _.get(this.options, 'size', 5),
      'desc');
    const searchSource = createSearchSource(
      this.kbnApi,
      initialSearchSourceState,
      indexPattern,
      aggs,
      this.useTimeFilter,
      ancestorFilters);

    const resp = await searchSource.fetch();
    const selectOptions = _.get(resp, 'aggregations.termsAgg.buckets', []).map((bucket) => {
      return { label: this.format(bucket.key), value: bucket.key.toString() };
    }).sort((a, b) => {
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });

    if(selectOptions.length === 0) {
      this.disable(noValuesDisableMsg(fieldName, indexPattern.title));
      return;
    }

    this.selectOptions = selectOptions;
    this.enable = true;
    this.disabledReason = '';
  }
}

export async function listControlFactory(controlParams, kbnApi, useTimeFilter) {
  let indexPattern;
  try {
    indexPattern = await kbnApi.indexPatterns.get(controlParams.indexPattern);
  } catch (err) {
    // ignore not found error and return control so it can be displayed in disabled state.
  }

  return new ListControl(
    controlParams,
    new PhraseFilterManager(controlParams.id, controlParams.fieldName, indexPattern, kbnApi.queryFilter),
    kbnApi,
    useTimeFilter
  );
}
