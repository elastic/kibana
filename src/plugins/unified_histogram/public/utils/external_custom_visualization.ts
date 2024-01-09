/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import type { Suggestion } from '@kbn/lens-plugin/public';
import type { ExternalCustomVisualization } from '../types';

export const extractExternalCustomVisualizationFromSuggestion = (
  currentSuggestion: Suggestion | undefined
): ExternalCustomVisualization | undefined => {
  if (!currentSuggestion) {
    return undefined;
  }

  const customVisualization: ExternalCustomVisualization = {
    visualizationId: currentSuggestion.visualizationId,
    visualizationState: currentSuggestion.visualizationState || {},
  };

  // TODO: is there a Lens util function we could use for serialization?

  if (
    typeof customVisualization.visualizationState === 'object' &&
    customVisualization.visualizationState &&
    'layers' in customVisualization.visualizationState &&
    Array.isArray(customVisualization.visualizationState.layers)
  ) {
    customVisualization.visualizationState = {
      ...customVisualization.visualizationState,
      layers: customVisualization.visualizationState.layers.map((layer) => omit(layer, 'layerId')),
      layerId: undefined,
    };
  }

  console.log('extracted custom vis', customVisualization);

  return customVisualization;
};

export const mergeCurrentSuggestionWithExternalCustomVisualization = ({
  allSuggestions,
  selectedSuggestion,
  customVisualization,
}: {
  allSuggestions: Suggestion[];
  selectedSuggestion?: Suggestion;
  customVisualization?: ExternalCustomVisualization;
}): Suggestion | undefined => {
  let currentSuggestion = selectedSuggestion || allSuggestions?.[0];

  if (customVisualization && typeof customVisualization.visualizationState === 'object') {
    const matchingSuggestion = allSuggestions.find(
      (suggestion) => suggestion.visualizationId === customVisualization.visualizationId
    );

    console.log(matchingSuggestion, customVisualization);

    if (typeof matchingSuggestion === 'object') {
      const layerId = matchingSuggestion.keptLayerIds[0];

      currentSuggestion = {
        ...matchingSuggestion,
        visualizationState: {
          ...(matchingSuggestion.visualizationState || {}),
          ...(customVisualization.visualizationState || {}),
          layers: customVisualization.visualizationState.layers
            ? customVisualization.visualizationState.layers.map((layer) => ({
                ...layer,
                layerId,
              }))
            : matchingSuggestion.visualizationState.layers,
          layerId: matchingSuggestion.visualizationState.layerId,
        },
      };

      console.log('merged suggestion', currentSuggestion.visualizationState);
    }
  }

  return currentSuggestion;
};

export const toExternalCustomVisualizationJSONString = (
  customVisualization: ExternalCustomVisualization | undefined
): string | undefined => {
  if (
    !customVisualization ||
    !customVisualization.visualizationId ||
    !customVisualization.visualizationState
  ) {
    return undefined;
  }

  return JSON.stringify(customVisualization);
};

export const fromExternalCustomVisualizationJSONString = (
  customVisualizationJSON: string | undefined
): ExternalCustomVisualization | undefined => {
  console.log('parsing JSON for', customVisualizationJSON);
  if (!customVisualizationJSON) {
    return undefined;
  }

  let customVisualization: ExternalCustomVisualization | undefined;

  try {
    customVisualization = JSON.parse(customVisualizationJSON);

    if (!customVisualization?.visualizationId || !customVisualization.visualizationState) {
      customVisualization = undefined;
      throw new Error('customVisualizationJSON is invalid');
    }
  } catch {
    // nothing
  }

  console.log('parsed custom vis', customVisualization);

  return customVisualization;
};
