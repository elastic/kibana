/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * !!! THIS ROUTE IS TEMPORARY !!!
 * Once we integrate with Lens for the charts, we will remove this route. This
 * will happen before we release this feature.
 */

import { z } from '@kbn/zod';
import type { FieldValue, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { createRoute } from '../create_route';
import { extractDimensionsFromESQL } from '../../lib/dimensions/extract_dimensions_from_esql';
import { throwNotFoundIfMetricsExperienceDisabled } from '../../lib/utils';

export const metricDataApi = createRoute({
  endpoint: 'POST /internal/metrics_experience/data',
  security: { authz: { requiredPrivileges: ['read'] } },
  params: z.object({
    body: z.object({
      esql: z.string(),
      from: z.string(),
      to: z.string(),
      filters: z.array(
        z.object({
          field: z.string(),
          value: z.string(),
        })
      ),
    }),
  }),
  handler: async ({ context, params }) => {
    const { elasticsearch, featureFlags } = await context.core;
    await throwNotFoundIfMetricsExperienceDisabled(featureFlags);

    const esClient = elasticsearch.client.asCurrentUser;
    const { esql, from, to, filters } = params.body;

    const startTimestamp = new Date(from).toISOString();
    const endTimestamp = new Date(to).toISOString();

    // Build base filter with timestamp range
    const baseFilter = {
      range: {
        '@timestamp': {
          gte: startTimestamp,
          lte: endTimestamp,
        },
      },
    };

    // Build the filter query
    let filterQuery: QueryDslQueryContainer;

    if (filters && Array.isArray(filters) && filters.length > 0) {
      // Create should clauses for OR behavior
      const shouldClauses = filters
        .filter((filter: { field: string; value: string }) => filter.field && filter.value)
        .map((filter: { field: string; value: string }) => ({
          term: {
            [filter.field]: filter.value,
          },
        }));

      if (shouldClauses.length > 0) {
        filterQuery = {
          bool: {
            filter: [baseFilter],
            should: shouldClauses,
            minimum_should_match: 1,
          },
        };
      } else {
        filterQuery = baseFilter;
      }
    } else {
      filterQuery = baseFilter;
    }

    const esqlResponse = await esClient.esql.query(
      {
        query: esql,
        filter: filterQuery,
        params: [{ _tstart: startTimestamp }, { _tend: endTimestamp }] as unknown as FieldValue[], // sigh... The types don't match reality
      },
      {
        meta: true,
      }
    );

    const responseBody = esqlResponse.body;

    // Handle data differently based on whether dimensions are present
    let data;
    const dimensions = extractDimensionsFromESQL(esql);
    if (dimensions.length > 0) {
      // With dimensions, we need to group data by dimension values
      const groupedData = new Map<
        string,
        {
          keyObject: Record<string, string>;
          data: Array<{ x: number; y: number }>;
        }
      >();

      responseBody.values?.forEach((row) => {
        const value = row[0];
        const timestamp = new Date(row[1] as string | number).getTime();

        // Skip null values to prevent chart warnings
        if (value === null || value === undefined) {
          return;
        }

        // Create key object from dimension values (starting at index 2)
        const dimensionValues = row.slice(2);
        const keyObject: Record<string, string> = {};
        dimensions.forEach((dim: string, index: number) => {
          keyObject[dim] = `${dimensionValues[index]}` || '';
        });

        // Use JSON string as map key for grouping
        const seriesKey = JSON.stringify(keyObject);

        if (!groupedData.has(seriesKey)) {
          groupedData.set(seriesKey, {
            keyObject,
            data: [],
          });
        }

        groupedData.get(seriesKey)!.data.push({
          x: timestamp,
          y: value as number,
        });
      });

      // Convert to array of series
      data = Array.from(groupedData.values()).map(({ keyObject, data: seriesData }) => ({
        key: keyObject,
        data: seriesData.sort((a, b) => a.x - b.x),
      }));
    } else {
      // Without dimensions, return single series as before
      data =
        responseBody.values?.map((row) => ({
          x: new Date(row[1] as string | number).getTime(),
          y: row[0],
        })) || [];
    }

    return {
      data,
      esql,
      hasDimensions: dimensions && dimensions.length > 0,
    };
  },
});
