/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import { keyBy } from 'lodash';
import { catchError, defer, from, map, of } from 'rxjs';
import { rateLimitingForkJoin } from '../../common/data_views/utils';
import type { QueryDslQueryContainer } from '../../common/types';

import {
  getFieldCapabilities,
  getCapabilitiesForRollupIndices,
  mergeCapabilitiesWithFields,
} from './lib';
import { DataViewType } from '../../common/types';

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
  defaultFormatter?: string;
}

interface FieldSubType {
  multi?: { parent: string };
  nested?: { path: string };
}

interface IndexPatternsFetcherOptionalParams {
  uiSettingsClient: IUiSettingsClient;
  allowNoIndices?: boolean;
  rollupsEnabled?: boolean;
}

export interface GetIndexPatternMatchesResult {
  matchedIndexPatterns: string[];
  matchedIndices?: string[];
  matchesByIndexPattern?: Record<string, string[]>;
}

export class IndexPatternsFetcher {
  private readonly uiSettingsClient?: IUiSettingsClient;
  private readonly allowNoIndices: boolean;
  private readonly rollupsEnabled: boolean;

  constructor(
    private readonly elasticsearchClient: ElasticsearchClient,
    optionalParams?: IndexPatternsFetcherOptionalParams
  ) {
    this.uiSettingsClient = optionalParams?.uiSettingsClient;
    this.allowNoIndices = optionalParams?.allowNoIndices || false;
    this.rollupsEnabled = optionalParams?.rollupsEnabled || false;
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
    allowHidden?: boolean;
    fieldTypes?: string[];
    includeEmptyFields?: boolean;
    abortSignal?: AbortSignal;
    runtimeMappings?: estypes.MappingRuntimeFields;
    projectRouting?: string;
  }): Promise<{ fields: FieldDescriptor[]; indices: string[] }> {
    const {
      pattern,
      metaFields = [],
      fieldCapsOptions,
      type,
      rollupIndex,
      indexFilter,
      allowHidden,
      fieldTypes,
      includeEmptyFields,
      abortSignal,
      runtimeMappings,
      projectRouting,
    } = options;
    const allowNoIndices = fieldCapsOptions?.allow_no_indices || this.allowNoIndices;

    const expandWildcards = allowHidden ? 'all' : 'open';

    const fieldCapsResponse = await getFieldCapabilities({
      callCluster: this.elasticsearchClient,
      uiSettingsClient: this.uiSettingsClient,
      indices: pattern,
      metaFields,
      fieldCapsOptions: {
        allow_no_indices: allowNoIndices,
        include_unmapped: fieldCapsOptions?.includeUnmapped,
      },
      indexFilter,
      fields: options.fields || ['*'],
      expandWildcards,
      fieldTypes,
      includeEmptyFields,
      runtimeMappings,
      abortSignal,
      projectRouting,
    });

    if (this.rollupsEnabled && type === DataViewType.ROLLUP && rollupIndex) {
      const rollupFields: FieldDescriptor[] = [];
      const capabilities = getCapabilitiesForRollupIndices(
        await this.elasticsearchClient.rollup.getRollupIndexCaps({
          index: rollupIndex,
        })
      );

      const capabilityCheck =
        // use the rollup index name BUT if its an alias, we'll take the first one
        capabilities[rollupIndex] || capabilities[Object.keys(capabilities)[0]];

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
   * Checks whether the passed index pattern is an excluding one.
   * The excluding index pattern starts with a dash, e.g. "-logs-excluded-*"
   * meaning all indices matching "logs-excluded-*" will be excluded from search
   *
   * @param indexPattern - Index pattern to check
   * @returns Whether the passed index pattern is a negated one
   */
  isExcludingIndexPattern(indexPattern: string): boolean {
    return indexPattern.trim().startsWith('-');
  }

  /**
   * For each input pattern, checks whether it resolves to at least one backing index.
   *
   * Including index patterns (not starting with `-`) are checked with field caps using that pattern
   * together with every excluding index pattern (starting with `-`) in the list, so resolution matches
   * Elasticsearch multi-target syntax.
   *
   * @param indexPatterns - Index patterns to check (may include wildcards and excluded entries).
   * @returns Resolves to {@link GetIndexPatternMatchesResult}:
   *   - `matchedIndexPatterns`: input patterns that matched at least one index.
   *   - `matchedIndices`: deduplicated concrete index names matching index patterns (omitted on failure).
   *   - `matchesByIndexPattern`: per-input-pattern matched indices (omitted on failure).
   */
  async getIndexPatternMatches(indexPatterns: string[]): Promise<GetIndexPatternMatchesResult> {
    const excludingIndexPatterns = indexPatterns.filter(this.isExcludingIndexPattern);
    const indexPatternsToMatch = indexPatterns
      .filter((indexPattern) => !this.isExcludingIndexPattern(indexPattern))
      .map((indexPattern) => [indexPattern, ...excludingIndexPatterns]);

    const matchIndexPatterns = indexPatternsToMatch.map((pattern) => {
      return defer(() =>
        from(
          this.getFieldsForWildcard({
            fields: ['_id'],
            pattern,
          })
        ).pipe(
          // expecting pattern[0] to contain an including index pattern
          // and pattern[1..end] to contain excluding index patterns
          map((match) => ({ ...match, indexPattern: pattern[0] })),
          catchError(() => of({ fields: [], indices: [], indexPattern: pattern[0] }))
        )
      );
    });

    return new Promise<GetIndexPatternMatchesResult>((resolve) => {
      rateLimitingForkJoin(matchIndexPatterns, 3, {
        fields: [],
        indices: [],
        indexPattern: '',
      }).subscribe((indexPatternMatches) => {
        const matchedIndexPatterns: string[] = [];
        const uniqueMatchedIndices = new Set<string>();
        const matchesByIndexPattern: Record<string, string[]> = {};

        for (const indexPatternMatch of indexPatternMatches) {
          const { indexPattern, indices } = indexPatternMatch;

          matchesByIndexPattern[indexPattern] = indices;

          if (indices.length === 0) {
            continue;
          }

          matchedIndexPatterns.push(indexPattern);

          for (const index of indices) {
            uniqueMatchedIndices.add(index);
          }
        }

        resolve({
          matchedIndexPatterns,
          matchedIndices: Array.from(uniqueMatchedIndices),
          matchesByIndexPattern,
        });
      });
    }).catch(() => ({ matchedIndexPatterns: [] }));
  }
}
