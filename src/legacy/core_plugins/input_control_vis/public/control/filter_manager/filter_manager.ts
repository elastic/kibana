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
import { IndexPattern } from 'ui/index_patterns';
import { Filter } from 'src/plugins/data/common/es_query/filters';
import { FilterManager as QueryFilterManager } from '../../../../../../plugins/data/public';

export abstract class FilterManager {
  controlId: string;
  fieldName: string;
  indexPattern: IndexPattern;
  queryFilter: QueryFilterManager;

  constructor(
    controlId: string,
    fieldName: string,
    indexPattern: IndexPattern,
    queryFilter: QueryFilterManager
  ) {
    this.controlId = controlId;
    this.fieldName = fieldName;
    this.indexPattern = indexPattern;
    this.queryFilter = queryFilter;
  }

  /**
   * Convert phrases into filter
   *
   * @param  {any[]} phrases
   * @returns PhraseFilter
   *   single phrase: match query
   *   multiple phrases: bool query with should containing list of match_phrase queries
   */
  abstract createFilter(phrases: any): Filter;

  abstract getValueFromFilterBar(): any;

  getIndexPattern(): IndexPattern {
    return this.indexPattern;
  }

  getField(): any {
    return this.indexPattern.fields.getByName(this.fieldName);
  }

  findFilters(): Filter[] {
    const kbnFilters = _.flatten([
      this.queryFilter.getAppFilters(),
      this.queryFilter.getGlobalFilters(),
    ]);
    return kbnFilters.filter(kbnFilter => {
      return _.get(kbnFilter, 'meta.controlledBy') === this.controlId;
    });
  }
}
