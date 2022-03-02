/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import _ from 'lodash';

import { FilterManager as QueryFilterManager, DataViewsContract } from '../../../../data/public';
import { DataView } from '../../../../data_views/public';

export abstract class FilterManager {
  protected indexPattern: DataView | undefined;

  constructor(
    public controlId: string,
    public fieldName: string,
    private indexPatternId: string,
    private indexPatternsService: DataViewsContract,
    protected queryFilter: QueryFilterManager
  ) {}

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

  async init() {
    try {
      if (!this.indexPattern) {
        this.indexPattern = await this.indexPatternsService.get(this.indexPatternId);
      }
    } catch (e) {
      // invalid index pattern id
    }
  }

  getIndexPattern(): DataView | undefined {
    return this.indexPattern;
  }

  getField() {
    return this.indexPattern?.fields.getByName(this.fieldName);
  }

  findFilters(): Filter[] {
    const kbnFilters = _.flatten([
      this.queryFilter.getAppFilters(),
      this.queryFilter.getGlobalFilters(),
    ]);
    return kbnFilters.filter((kbnFilter: Filter) => {
      return _.get(kbnFilter, 'meta.controlledBy') === this.controlId;
    });
  }
}
