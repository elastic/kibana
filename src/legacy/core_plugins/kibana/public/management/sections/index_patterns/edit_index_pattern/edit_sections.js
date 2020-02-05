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
import { i18n } from '@kbn/i18n';

function filterBy(items, key, filter) {
  const lowercaseFilter = (filter || '').toLowerCase();
  return items.filter(item => item[key].toLowerCase().includes(lowercaseFilter));
}

function getCounts(fields, sourceFilters, fieldFilter = '') {
  const fieldCount = _.countBy(filterBy(fields, 'name', fieldFilter), function(field) {
    return field.scripted ? 'scripted' : 'indexed';
  });

  _.defaults(fieldCount, {
    indexed: 0,
    scripted: 0,
    sourceFilters: sourceFilters ? filterBy(sourceFilters, 'value', fieldFilter).length : 0,
  });

  return fieldCount;
}

export function IndicesEditSectionsProvider() {
  return function(indexPattern, fieldFilter, indexPatternListProvider) {
    const totalCount = getCounts(indexPattern.fields, indexPattern.sourceFilters);
    const filteredCount = getCounts(indexPattern.fields, indexPattern.sourceFilters, fieldFilter);

    const editSections = [];

    editSections.push({
      title: i18n.translate('kbn.management.editIndexPattern.tabs.fieldsHeader', {
        defaultMessage: 'Fields',
      }),
      index: 'indexedFields',
      count: filteredCount.indexed,
      totalCount: totalCount.indexed,
    });

    if (indexPatternListProvider.areScriptedFieldsEnabled(indexPattern)) {
      editSections.push({
        title: i18n.translate('kbn.management.editIndexPattern.tabs.scriptedHeader', {
          defaultMessage: 'Scripted fields',
        }),
        index: 'scriptedFields',
        count: filteredCount.scripted,
        totalCount: totalCount.scripted,
      });
    }

    editSections.push({
      title: i18n.translate('kbn.management.editIndexPattern.tabs.sourceHeader', {
        defaultMessage: 'Source filters',
      }),
      index: 'sourceFilters',
      count: filteredCount.sourceFilters,
      totalCount: totalCount.sourceFilters,
    });

    return editSections;
  };
}
