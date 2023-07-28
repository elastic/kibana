/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
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
  timeSeriesMetric?: estypes.MappingTimeSeriesMetricType;
  timeSeriesDimension?: boolean;
}

interface FieldSubType {
  multi?: { parent: string };
  nested?: { path: string };
}

export class IndexPatternsFetcher {
  private elasticsearchClient: ElasticsearchClient;
  private allowNoIndices: boolean;
  private rollupsEnabled: boolean;

  constructor(
    elasticsearchClient: ElasticsearchClient,
    allowNoIndices: boolean = false,
    rollupsEnabled: boolean = false
  ) {
    this.elasticsearchClient = elasticsearchClient;
    this.allowNoIndices = allowNoIndices;
    this.rollupsEnabled = rollupsEnabled;
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
    const allowNoIndices = fieldCapsOptions
      ? fieldCapsOptions.allow_no_indices
      : this.allowNoIndices;

    const fieldCapsResponse = await getFieldCapabilities({
      callCluster: this.elasticsearchClient,
      indices: pattern,
      metaFields,
      fieldCapsOptions: {
        allow_no_indices: allowNoIndices,
        include_unmapped: fieldCapsOptions?.includeUnmapped,
      },
      indexFilter,
      fields: options.fields || ['*'],
    });

    if (this.rollupsEnabled && type === 'rollup' && rollupIndex) {
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
}
