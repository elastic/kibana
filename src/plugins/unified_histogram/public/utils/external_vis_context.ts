/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { PieVisualizationState, Suggestion, XYState } from '@kbn/lens-plugin/public';
import { UnifiedHistogramSuggestionType, UnifiedHistogramVisContext } from '../types';
import { removeTablesFromLensAttributes } from './lens_vis_from_table';

export interface QueryParams {
  dataView: DataView;
  query?: Query | AggregateQuery;
  filters: Filter[] | undefined;
  isPlainRecord?: boolean;
  columns?: DatatableColumn[];
  columnsMap?: Record<string, DatatableColumn>;
  timeRange?: TimeRange;
}

export const exportVisContext = (
  visContext: UnifiedHistogramVisContext | undefined
): UnifiedHistogramVisContext | undefined => {
  if (
    !visContext ||
    !visContext.requestData ||
    !visContext.attributes ||
    !visContext.suggestionType
  ) {
    return undefined;
  }

  try {
    const lightweightVisContext = visContext
      ? {
          suggestionType: visContext.suggestionType,
          requestData: visContext.requestData,
          attributes: removeTablesFromLensAttributes(visContext.attributes),
        }
      : undefined;

    const visContextWithoutUndefinedValues = lightweightVisContext
      ? JSON.parse(JSON.stringify(lightweightVisContext))
      : undefined;

    return visContextWithoutUndefinedValues;
  } catch {
    return undefined;
  }
};

export function canImportVisContext(
  visContext: unknown | undefined
): visContext is UnifiedHistogramVisContext {
  return (
    !!visContext &&
    typeof visContext === 'object' &&
    'requestData' in visContext &&
    'attributes' in visContext &&
    'suggestionType' in visContext &&
    !!visContext.requestData &&
    !!visContext.attributes &&
    !!visContext.suggestionType &&
    typeof visContext.requestData === 'object' &&
    typeof visContext.attributes === 'object' &&
    typeof visContext.suggestionType === 'string'
  );
}

export const isSuggestionShapeAndVisContextCompatible = (
  suggestion: Suggestion | undefined,
  externalVisContext: UnifiedHistogramVisContext | undefined
): boolean => {
  if (!suggestion && !externalVisContext) {
    return true;
  }

  if (suggestion?.visualizationId !== externalVisContext?.attributes?.visualizationType) {
    return false;
  }

  if (externalVisContext?.suggestionType !== UnifiedHistogramSuggestionType.lensSuggestion) {
    return true;
  }

  if (suggestion?.visualizationId === 'lnsXY') {
    return (
      (suggestion?.visualizationState as XYState)?.preferredSeriesType ===
      (externalVisContext?.attributes?.state?.visualization as XYState)?.preferredSeriesType
    );
  }

  return (
    (suggestion?.visualizationState as PieVisualizationState)?.shape ===
    (externalVisContext?.attributes?.state?.visualization as PieVisualizationState)?.shape
  );
};

export function deriveLensSuggestionFromLensAttributes({
  externalVisContext,
  queryParams,
}: {
  externalVisContext: UnifiedHistogramVisContext | undefined;
  queryParams: QueryParams | null;
}): Suggestion | undefined {
  if (!externalVisContext) {
    return undefined;
  }

  try {
    if (externalVisContext.suggestionType === UnifiedHistogramSuggestionType.lensSuggestion) {
      // should be based on same query
      if (queryParams && !isEqual(externalVisContext.attributes?.state?.query, queryParams.query)) {
        return undefined;
      }

      // it should be one of 'formBased'/'textBased' and have value
      const datasourceId: 'formBased' | 'textBased' | undefined = [
        'formBased' as const,
        'textBased' as const,
      ].find((key) => Boolean(externalVisContext.attributes.state.datasourceStates[key]));

      if (!datasourceId) {
        return undefined;
      }

      const datasourceState = externalVisContext.attributes.state.datasourceStates[datasourceId];

      // should be based on same columns
      if (
        queryParams &&
        (!datasourceState?.layers ||
          Object.values(datasourceState?.layers).some(
            (layer) =>
              isEqual(layer.query, queryParams.query) &&
              layer.columns?.some(
                // unknown column
                (c: { fieldName: string }) => !queryParams.columnsMap?.[c.fieldName]
              )
          ))
      ) {
        return undefined;
      }

      return {
        title: externalVisContext.attributes.title,
        visualizationId: externalVisContext.attributes.visualizationType,
        visualizationState: externalVisContext.attributes.state.visualization,
        datasourceState,
        datasourceId,
      } as Suggestion;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
