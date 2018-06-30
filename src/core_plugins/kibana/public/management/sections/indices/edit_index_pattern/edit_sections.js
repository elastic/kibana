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

export function IndicesEditSectionsProvider(i18n) {

  return function (indexPattern) {
    const fieldCount = _.countBy(indexPattern.fields, function (field) {
      return (field.scripted) ? 'scripted' : 'indexed';
    });

    _.defaults(fieldCount, {
      indexed: 0,
      scripted: 0,
      sourceFilters: indexPattern.sourceFilters ? indexPattern.sourceFilters.length : 0,
    });

    return [
      {
        title: i18n('kbn.management.indexPattern.edit.tabs.fields.header', { defaultMessage: 'Fields' }),
        index: 'indexedFields',
        count: fieldCount.indexed
      },
      {
        title: i18n('kbn.management.indexPattern.edit.tabs.scripted.header', { defaultMessage: 'Scripted fields' }),
        index: 'scriptedFields',
        count: fieldCount.scripted
      },
      {
        title: i18n('kbn.management.indexPattern.edit.tabs.source.header', { defaultMessage: 'Source filters' }),
        index: 'sourceFilters',
        count: fieldCount.sourceFilters
      }
    ];
  };
}
