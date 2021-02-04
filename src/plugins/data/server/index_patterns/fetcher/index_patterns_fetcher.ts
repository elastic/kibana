/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';
import { keyBy } from 'lodash';

import {
  getFieldCapabilities,
  resolveTimePattern,
  createNoMatchingIndicesError,
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
    fieldCapsOptions?: { allow_no_indices: boolean };
    type?: string;
    rollupIndex?: string;
  }): Promise<FieldDescriptor[]> {
    const { pattern, metaFields, fieldCapsOptions, type, rollupIndex } = options;
    const patternList = Array.isArray(pattern) ? pattern : pattern.split(',');
    const patternListActive = await this.validatePatternListActive(patternList);
    const fieldCapsResponse = await getFieldCapabilities(
      this.elasticsearchClient,
      patternListActive.length > 0 ? patternListActive : patternList,
      metaFields,
      {
        allow_no_indices: fieldCapsOptions
          ? fieldCapsOptions.allow_no_indices
          : this.allowNoIndices,
      }
    );

    if (type === 'rollup' && rollupIndex) {
      const rollupFields: FieldDescriptor[] = [];
      const rollupIndexCapabilities = getCapabilitiesForRollupIndices(
        (
          await this.elasticsearchClient.rollup.getRollupIndexCaps({
            index: rollupIndex,
          })
        ).body
      )[rollupIndex].aggs;
      const fieldCapsResponseObj = keyBy(fieldCapsResponse, 'name');

      // Keep meta fields
      metaFields!.forEach(
        (field: string) =>
          fieldCapsResponseObj[field] && rollupFields.push(fieldCapsResponseObj[field])
      );

      return mergeCapabilitiesWithFields(
        rollupIndexCapabilities,
        fieldCapsResponseObj,
        rollupFields
      );
    }
    return fieldCapsResponse;
  }

  /**
   *  Get a list of field objects for a time pattern
   *
   *  @param {Object} [options={}]
   *  @property {String} options.pattern The moment compatible time pattern
   *  @property {Number} options.lookBack The number of indices we will pull mappings for
   *  @property {Number} options.metaFields The list of underscore prefixed fields that should
   *                                        be left in the field list (all others are removed).
   *  @return {Promise<Array<Fields>>}
   */
  async getFieldsForTimePattern(options: {
    pattern: string;
    metaFields: string[];
    lookBack: number;
    interval: string;
  }) {
    const { pattern, lookBack, metaFields } = options;
    const { matches } = await resolveTimePattern(this.elasticsearchClient, pattern);
    const indices = matches.slice(0, lookBack);
    if (indices.length === 0) {
      throw createNoMatchingIndicesError(pattern);
    }
    return await getFieldCapabilities(this.elasticsearchClient, indices, metaFields);
  }

  /**
   *  Get a list of field objects for a time pattern
   *
   *  @param patternList string[]
   *  @return {Promise<string[]>}
   */
  async validatePatternListActive(patternList: string[]) {
    const result = await Promise.all(
      patternList.map((pattern) =>
        this.elasticsearchClient.transport.request({
          method: 'GET',
          path: `/_resolve/index/${encodeURIComponent(pattern)}`,
        })
      )
    );
    return result.reduce(
      (acc: string[], { body: indexLookup }, patternListIndex) =>
        indexLookup.indices && indexLookup.indices.length > 0
          ? [...acc, patternList[patternListIndex]]
          : acc,
      []
    );
  }
}
