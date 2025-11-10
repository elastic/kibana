/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardState } from '../../content_management';
import type { Filter } from '@kbn/es-query';
import { isOfAggregateQueryType, getAggregateQueryMode } from '@kbn/es-query';

/**
 * Recursively searches for ESQL queries in an object
 * Uses a Set to track visited objects and prevent infinite loops
 */
function findEsqlQueries(
  obj: unknown,
  queries: string[] = [],
  visited: Set<unknown> = new Set(),
  depth = 0,
  maxDepth = 20
): void {
  // Limit recursion depth to prevent stack overflow
  if (depth > maxDepth) {
    return;
  }

  if (!obj || typeof obj !== 'object') {
    return;
  }

  // Prevent infinite loops with circular references
  if (visited.has(obj)) {
    return;
  }
  visited.add(obj);

  const objRecord = obj as Record<string, unknown>;

  // Check if this object is an AggregateQuery with ESQL
  // First try the proper type check
  if (isOfAggregateQueryType(objRecord)) {
    const mode = getAggregateQueryMode(objRecord);
    if (mode === 'esql' && 'esql' in objRecord && typeof objRecord.esql === 'string') {
      const esqlQuery = objRecord.esql;
      // Avoid duplicates
      if (!queries.includes(esqlQuery)) {
        queries.push(esqlQuery);
      }
      // Don't return - continue searching for more queries in nested structures
    }
  }
  
  // Fallback: Direct check for esql property (in case type check fails)
  if ('esql' in objRecord && typeof objRecord.esql === 'string' && objRecord.esql.trim().length > 0) {
    const esqlQuery = objRecord.esql;
    // Avoid duplicates
    if (!queries.includes(esqlQuery)) {
      queries.push(esqlQuery);
    }
  }

  // Recursively search through all properties
  if (Array.isArray(objRecord)) {
    // Handle arrays
    for (const item of objRecord) {
      findEsqlQueries(item, queries, visited, depth + 1, maxDepth);
    }
  } else {
    // Handle objects
    for (const key in objRecord) {
      if (Object.prototype.hasOwnProperty.call(objRecord, key)) {
        const value = objRecord[key];
        findEsqlQueries(value, queries, visited, depth + 1, maxDepth);
      }
    }
  }
}

/**
 * Extracts ESQL queries from lens panel config
 * Handles various structures:
 * - config.query.esql (top-level query)
 * - config.attributes.state.query.esql (main query in lens attributes)
 * - config.attributes.state.datasourceStates.textBased.layers[].query.esql (layer queries)
 * - Any other nested structure containing ESQL queries
 */
function extractEsqlQueriesFromLensPanel(config: Record<string, unknown>): string[] | undefined {
  const queries: string[] = [];

  // Check if this is a by-reference panel (has savedObjectId)
  if (config.savedObjectId) {
    // By-reference panels don't have the query in the config, it's in the saved object
    // We can't access it here without loading the saved object
    return undefined;
  }

  // Check top-level query first (embeddableConfig.query.esql)
  if (config.query) {
    const query = config.query;
    if (isOfAggregateQueryType(query)) {
      const mode = getAggregateQueryMode(query);
      if (mode === 'esql' && 'esql' in query && typeof query.esql === 'string') {
        queries.push(query.esql);
      }
    }
    // Fallback: direct esql check
    if ('esql' in query && typeof (query as Record<string, unknown>).esql === 'string') {
      const esqlQuery = (query as Record<string, unknown>).esql as string;
      if (!queries.includes(esqlQuery)) {
        queries.push(esqlQuery);
      }
    }
  }

  // Check for attributes.state.query (main query)
  if (config.attributes && typeof config.attributes === 'object') {
    const attributes = config.attributes as Record<string, unknown>;
    if (attributes.state && typeof attributes.state === 'object') {
      const state = attributes.state as Record<string, unknown>;
      
      // Check main query
      if (state.query) {
        const query = state.query;
        if (isOfAggregateQueryType(query)) {
          const mode = getAggregateQueryMode(query);
          if (mode === 'esql' && 'esql' in query && typeof query.esql === 'string') {
            queries.push(query.esql);
          }
        }
        // Fallback: direct esql check
        if ('esql' in query && typeof (query as Record<string, unknown>).esql === 'string') {
          const esqlQuery = (query as Record<string, unknown>).esql as string;
          if (!queries.includes(esqlQuery)) {
            queries.push(esqlQuery);
          }
        }
      }
      
      // Check datasourceStates.textBased.layers for layer queries
      if (state.datasourceStates && typeof state.datasourceStates === 'object') {
        const datasourceStates = state.datasourceStates as Record<string, unknown>;
        if (datasourceStates.textBased && typeof datasourceStates.textBased === 'object') {
          const textBased = datasourceStates.textBased as Record<string, unknown>;
          if (textBased.layers && typeof textBased.layers === 'object') {
            const layers = textBased.layers as Record<string, unknown>;
            for (const layerId in layers) {
              if (Object.prototype.hasOwnProperty.call(layers, layerId)) {
                const layer = layers[layerId] as Record<string, unknown>;
                if (layer.query) {
                  const layerQuery = layer.query;
                  if (isOfAggregateQueryType(layerQuery)) {
                    const mode = getAggregateQueryMode(layerQuery);
                    if (mode === 'esql' && 'esql' in layerQuery && typeof layerQuery.esql === 'string') {
                      const esqlQuery = layerQuery.esql;
                      if (!queries.includes(esqlQuery)) {
                        queries.push(esqlQuery);
                      }
                    }
                  }
                  // Fallback: direct esql check
                  if ('esql' in layerQuery && typeof (layerQuery as Record<string, unknown>).esql === 'string') {
                    const esqlQuery = (layerQuery as Record<string, unknown>).esql as string;
                    if (!queries.includes(esqlQuery)) {
                      queries.push(esqlQuery);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Also use recursive search as a fallback to catch any other structures
  findEsqlQueries(config, queries);

  return queries.length > 0 ? queries : undefined;
}

/**
 * Formats a filter for display in markdown
 */
function formatFilter(filter: Filter): string {
  const parts: string[] = [];

  if (filter.meta?.key) {
    parts.push(`**${filter.meta.key}**`);
  }

  if (filter.meta?.value) {
    parts.push(String(filter.meta.value));
  }

  if (filter.meta?.negate) {
    parts.push('(negated)');
  }

  if (filter.meta?.disabled) {
    parts.push('(disabled)');
  }

  return parts.join(' ');
}

/**
 * Formats dashboard configuration as markdown
 */
export function formatDashboardMarkdown(
  dashboardState: DashboardState,
  dashboardId?: string
): string {
  const lines: string[] = [];

  // Dashboard header
  lines.push('# Dashboard Configuration');
  lines.push('');

  // Basic info
  lines.push('## Dashboard Information');
  lines.push('');
  lines.push(`**Title:** ${dashboardState.title || 'Untitled Dashboard'}`);
  if (dashboardId) {
    lines.push(`**ID:** ${dashboardId}`);
  }
  if (dashboardState.description) {
    lines.push(`**Description:** ${dashboardState.description}`);
  }
  lines.push('');

  // Time range
  lines.push('## Time Range');
  lines.push('');
  if (dashboardState.timeRange) {
    lines.push(`- **From:** ${dashboardState.timeRange.from}`);
    lines.push(`- **To:** ${dashboardState.timeRange.to}`);
  } else {
    lines.push('No time range set');
  }
  lines.push('');

  // Filters
  lines.push('## Filters');
  lines.push('');
  if (dashboardState.filters && dashboardState.filters.length > 0) {
    dashboardState.filters.forEach((filter, index) => {
      lines.push(`${index + 1}. ${formatFilter(filter as Filter)}`);
    });
  } else {
    lines.push('No filters applied');
  }
  lines.push('');

  // Panels
  lines.push('## Panels');
  lines.push('');
  const panels = dashboardState.panels ?? [];
  if (panels.length > 0) {
    panels.forEach((panel, index) => {
      const panelTitle = (panel.config as Record<string, unknown>)?.title as string | undefined;
      const panelDescription = (panel.config as Record<string, unknown>)
        ?.description as string | undefined;

      lines.push(`### Panel ${index + 1}: ${panelTitle || panel.type || 'Untitled'}`);
      lines.push('');
      lines.push(`- **ID:** ${panel.uid ?? 'N/A'}`);
      lines.push(`- **Type:** ${panel.type}`);
      if (panelDescription) {
        lines.push(`- **Description:** ${panelDescription}`);
      }

      // ESQL queries for lens panels
      if (panel.type === 'lens') {
        const esqlQueries = extractEsqlQueriesFromLensPanel(panel.config as Record<string, unknown>);
        if (esqlQueries && esqlQueries.length > 0) {
          lines.push('- **ESQL Queries:**');
          esqlQueries.forEach((query, queryIndex) => {
            lines.push(`  ${queryIndex + 1}. \`\`\`esql`);
            lines.push(`  ${query}`);
            lines.push(`  \`\`\``);
          });
        }
      }

      lines.push('');
    });
  } else {
    lines.push('No panels in dashboard');
  }

  return lines.join('\n');
}

