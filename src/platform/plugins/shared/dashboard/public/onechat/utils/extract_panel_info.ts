/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '../../dashboard_api/types';
import type { SerializedPanelState } from '@kbn/presentation-publishing';
import { isOfAggregateQueryType, getAggregateQueryMode } from '@kbn/es-query';

export interface PanelInfo {
  id: string;
  type: string;
  title?: string;
  description?: string;
  esqlQueries?: string[];
}

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
 * Extracts ESQL queries from a lens panel's serialized state
 * Handles various structures:
 * - rawState.query.esql (top-level query)
 * - rawState.attributes.state.query.esql (main query in lens attributes)
 * - rawState.attributes.state.datasourceStates.textBased.layers[].query.esql (layer queries)
 * - Any other nested structure containing ESQL queries
 */
function extractEsqlQueriesFromLensPanel(
  serializedState: SerializedPanelState
): string[] | undefined {
  const rawState = serializedState.rawState;
  if (!rawState) {
    return undefined;
  }

  // Check if this is a lens panel
  if (rawState.type !== 'lens') {
    return undefined;
  }

  const queries: string[] = [];

  // Check if this is a by-reference panel
  if ('savedObjectId' in rawState && rawState.savedObjectId) {
    // By-reference panels don't have the query in the rawState, it's in the saved object
    // We can't access it here without loading the saved object
    return undefined;
  }

  // Check top-level query first (embeddableConfig.query.esql)
  if ('query' in rawState && rawState.query) {
    const query = rawState.query;
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
  if ('attributes' in rawState && rawState.attributes && typeof rawState.attributes === 'object') {
    const attributes = rawState.attributes as Record<string, unknown>;
    if ('state' in attributes && attributes.state && typeof attributes.state === 'object') {
      const state = attributes.state as Record<string, unknown>;
      
      // Check main query
      if ('query' in state && state.query) {
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
      if ('datasourceStates' in state && state.datasourceStates && typeof state.datasourceStates === 'object') {
        const datasourceStates = state.datasourceStates as Record<string, unknown>;
        if ('textBased' in datasourceStates && datasourceStates.textBased && typeof datasourceStates.textBased === 'object') {
          const textBased = datasourceStates.textBased as Record<string, unknown>;
          if ('layers' in textBased && textBased.layers && typeof textBased.layers === 'object') {
            const layers = textBased.layers as Record<string, unknown>;
            for (const layerId in layers) {
              if (Object.prototype.hasOwnProperty.call(layers, layerId)) {
                const layer = layers[layerId] as Record<string, unknown>;
                if ('query' in layer && layer.query) {
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
  findEsqlQueries(rawState, queries);

  return queries.length > 0 ? queries : undefined;
}

/**
 * Extracts panel information from dashboard API
 */
export function extractPanelInfo(dashboardApi: DashboardApi): PanelInfo[] {
  const serializedState = dashboardApi.getSerializedState();
  const panels = serializedState.attributes.panels ?? [];

  return panels.map((panel) => {
    const panelId = panel.uid ?? '';
    const panelType = panel.type;
    
    // Try to get panel details from dashboard API
    let panelInfo: PanelInfo = {
      id: panelId,
      type: panelType,
    };

    try {
      const panelData = dashboardApi.getDashboardPanelFromId(panelId);
      
      // Extract title and description from panel config if available
      const config = panel.config as Record<string, unknown>;
      if (config.title) {
        panelInfo.title = String(config.title);
      }
      if (config.description) {
        panelInfo.description = String(config.description);
      }

      // Extract ESQL queries for lens panels
      if (panelType === 'lens') {
        const esqlQueries = extractEsqlQueriesFromLensPanel(panelData.serializedState);
        if (esqlQueries) {
          panelInfo.esqlQueries = esqlQueries;
        }
      }
    } catch (error) {
      // Panel might not be loaded yet, continue with basic info
    }

    return panelInfo;
  });
}

