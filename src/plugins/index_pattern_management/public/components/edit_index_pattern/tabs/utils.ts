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

import { Dictionary, countBy, defaults, uniq } from 'lodash';
import { i18n } from '@kbn/i18n';
import { IndexPattern, IndexPatternField } from '../../../../../../plugins/data/public';
import { IndexPatternManagementStart } from '../../../../../../plugins/index_pattern_management/public';
import { TAB_INDEXED_FIELDS, TAB_SCRIPTED_FIELDS, TAB_SOURCE_FILTERS } from '../constants';

function filterByName(items: IndexPatternField[], filter: string) {
  const lowercaseFilter = (filter || '').toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(lowercaseFilter));
}

function getCounts(
  fields: IndexPatternField[],
  sourceFilters: {
    excludes: string[];
  },
  fieldFilter = ''
) {
  const fieldCount = countBy(filterByName(fields, fieldFilter), function (field) {
    return field.scripted ? 'scripted' : 'indexed';
  });

  defaults(fieldCount, {
    indexed: 0,
    scripted: 0,
    sourceFilters: sourceFilters.excludes
      ? sourceFilters.excludes.filter((value) =>
          value.toLowerCase().includes(fieldFilter.toLowerCase())
        ).length
      : 0,
  });

  return fieldCount;
}

function getTitle(type: string, filteredCount: Dictionary<number>, totalCount: Dictionary<number>) {
  let title = '';
  switch (type) {
    case 'indexed':
      title = i18n.translate('indexPatternManagement.editIndexPattern.tabs.fieldsHeader', {
        defaultMessage: 'Fields',
      });
      break;
    case 'scripted':
      title = i18n.translate('indexPatternManagement.editIndexPattern.tabs.scriptedHeader', {
        defaultMessage: 'Scripted fields',
      });
      break;
    case 'sourceFilters':
      title = i18n.translate('indexPatternManagement.editIndexPattern.tabs.sourceHeader', {
        defaultMessage: 'Source filters',
      });
      break;
  }
  const count = ` (${
    filteredCount[type] === totalCount[type]
      ? filteredCount[type]
      : filteredCount[type] + ' / ' + totalCount[type]
  })`;
  return title + count;
}

export function getTabs(
  indexPattern: IndexPattern,
  fieldFilter: string,
  indexPatternListProvider: IndexPatternManagementStart['list']
) {
  const totalCount = getCounts(indexPattern.fields, indexPattern.getSourceFiltering());
  const filteredCount = getCounts(
    indexPattern.fields,
    indexPattern.getSourceFiltering(),
    fieldFilter
  );

  const tabs = [];

  tabs.push({
    name: getTitle('indexed', filteredCount, totalCount),
    id: TAB_INDEXED_FIELDS,
    'data-test-subj': 'tab-indexedFields',
  });

  if (indexPatternListProvider.areScriptedFieldsEnabled(indexPattern)) {
    tabs.push({
      name: getTitle('scripted', filteredCount, totalCount),
      id: TAB_SCRIPTED_FIELDS,
      'data-test-subj': 'tab-scriptedFields',
    });
  }

  tabs.push({
    name: getTitle('sourceFilters', filteredCount, totalCount),
    id: TAB_SOURCE_FILTERS,
    'data-test-subj': 'tab-sourceFilters',
  });

  return tabs;
}

export function getPath(field: IndexPatternField) {
  return `/patterns/${field.indexPattern?.id}/field/${field.name}`;
}

const allTypesDropDown = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.allTypesDropDown',
  {
    defaultMessage: 'All field types',
  }
);

const allLangsDropDown = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.allLangsDropDown',
  {
    defaultMessage: 'All languages',
  }
);

export function convertToEuiSelectOption(options: string[], type: string) {
  const euiOptions =
    options.length > 0
      ? [
          {
            value: '',
            text: type === 'scriptedFieldLanguages' ? allLangsDropDown : allTypesDropDown,
          },
        ]
      : [];
  return euiOptions.concat(
    uniq(options).map((option) => {
      return {
        value: option,
        text: option,
      };
    })
  );
}
