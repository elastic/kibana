/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { keyBy } from 'lodash';
import type { QueryDslQueryContainer } from '../../common/types';

import {
  getFieldCapabilities,
  getCapabilitiesForRollupIndices,
  mergeCapabilitiesWithFields,
} from './lib';

export interface FieldDescriptor {
  aggregatable: boolean;
  name: string;
  readFromDocValues: boolean;
  searchable: boolean;
  type: string;
  esTypes: string[];
  subType?: FieldSubType;
  metadata_field?: boolean;
  fixedInterval?: string[];
  timeZone?: string[];
  timeSeriesMetric?: 'histogram' | 'summary' | 'counter' | 'gauge';
  timeSeriesDimension?: boolean;
}

interface FieldSubType {
  multi?: { parent: string };
  nested?: { path: string };
}

export class IndexPatternsFetcher {
  private elasticsearchClient: ElasticsearchClient;
  private allowNoIndices: boolean;

  constructor(elasticsearchClient: ElasticsearchClient, allowNoIndices: boolean = false) {
    this.elasticsearchClient = elasticsearchClient;
    this.allowNoIndices = allowNoIndices;
  }

  /**
   *  Get a list of field objects for an index pattern that may contain wildcards
   *
   *  @param {Object} [options]
   *  @property {String} options.pattern The index pattern
   *  @property {Number} options.metaFields The list of underscore prefixed fields that should
   *                                        be left in the field list (all others are removed).
   *  @return {Promise<Array<Fields>>}
   */
  async getFieldsForWildcard(options: {
    pattern: string | string[];
    metaFields?: string[];
    fieldCapsOptions?: { allow_no_indices: boolean; includeUnmapped?: boolean };
    type?: string;
    rollupIndex?: string;
    indexFilter?: QueryDslQueryContainer;
    fields?: string[];
  }): Promise<{ fields: FieldDescriptor[]; indices: string[] }> {
    const { pattern, metaFields = [], fieldCapsOptions, type, rollupIndex, indexFilter } = options;
    const patternList = Array.isArray(pattern) ? pattern : pattern.split(',');
    const allowNoIndices = fieldCapsOptions
      ? fieldCapsOptions.allow_no_indices
      : this.allowNoIndices;
    let patternListActive: string[] = patternList;
    // if only one pattern, don't bother with validation. We let getFieldCapabilities fail if the single pattern is bad regardless
    if (patternList.length > 1 && !allowNoIndices) {
      patternListActive = await this.validatePatternListActive(patternList);
    }
    const fieldCapsResponse = await getFieldCapabilities({
      callCluster: this.elasticsearchClient,
      indices: patternListActive,
      metaFields,
      fieldCapsOptions: {
        allow_no_indices: allowNoIndices,
        include_unmapped: fieldCapsOptions?.includeUnmapped,
      },
      indexFilter,
      fields: options.fields || ['*'],
    });
    if (type === 'rollup' && rollupIndex) {
      const rollupFields: FieldDescriptor[] = [];
      const capabilityCheck = getCapabilitiesForRollupIndices(
        await this.elasticsearchClient.rollup.getRollupIndexCaps({
          index: rollupIndex,
        })
      )[rollupIndex];

      if (capabilityCheck.error) {
        throw new Error(capabilityCheck.error);
      }

      const rollupIndexCapabilities = capabilityCheck.aggs;
      const fieldCapsResponseObj = keyBy(fieldCapsResponse.fields, 'name');
      // Keep meta fields
      metaFields!.forEach(
        (field: string) =>
          fieldCapsResponseObj[field] && rollupFields.push(fieldCapsResponseObj[field])
      );
      return {
        fields: mergeCapabilitiesWithFields(
          rollupIndexCapabilities!,
          fieldCapsResponseObj,
          rollupFields
        ),
        indices: fieldCapsResponse.indices,
      };
    }
    return fieldCapsResponse;
  }

  /**
   *  Returns an index pattern list of only those index pattern strings in the given list that return indices
   *
   *  @param patternList string[]
   *  @return {Promise<string[]>}
   */
  async validatePatternListActive(patternList: string[]) {
    const result = await Promise.all(
      patternList
        .map(async (index) => {
          // perserve negated patterns
          if (index.startsWith('-') || index.includes(':-')) {
            return true;
          }
          const searchResponse = await this.elasticsearchClient.fieldCaps({
            index,
            fields: '_id',
            ignore_unavailable: true,
            allow_no_indices: false,
          });
          return searchResponse.indices.length > 0;
        })
        .map((p) => p.catch(() => false))
    );
    return result.reduce(
      (acc: string[], isValid, patternListIndex) =>
        isValid ? [...acc, patternList[patternListIndex]] : acc,
      []
    );
  }
}
