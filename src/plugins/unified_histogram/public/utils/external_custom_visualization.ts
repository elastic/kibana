/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual, pick } from 'lodash';
import type { Suggestion } from '@kbn/lens-plugin/public';
import type { ExternalCustomVisualization } from '../types';

export const extractExternalCustomVisualizationFromSuggestion = (
  currentSuggestion: Suggestion | undefined
): ExternalCustomVisualization | undefined => {
  if (!currentSuggestion?.visualizationId || !currentSuggestion?.visualizationState) {
    return undefined;
  }

  const customVisualization: ExternalCustomVisualization = {
    visualizationId: currentSuggestion.visualizationId,
    visualizationState:
      currentSuggestion.visualizationState as ExternalCustomVisualization['visualizationState'],
  };

  // TODO: is there a Lens util function we could use for serialization?

  customVisualization.visualizationState = replaceLayerIdInVisualizationState(
    customVisualization.visualizationState,
    undefined
  );

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

  if (!customVisualization?.visualizationId || !customVisualization?.visualizationState) {
    return currentSuggestion;
  }

  const matchingSuggestion = allSuggestions.find(
    (suggestion) => suggestion.visualizationId === customVisualization.visualizationId
  );

  if (
    matchingSuggestion?.visualizationState &&
    typeof matchingSuggestion?.visualizationState === 'object'
  ) {
    const matchingVisualizationState: ExternalCustomVisualization['visualizationState'] =
      matchingSuggestion.visualizationState as ExternalCustomVisualization['visualizationState'];

    const layerId =
      'layerId' in matchingVisualizationState
        ? matchingVisualizationState.layerId
        : matchingSuggestion.keptLayerIds[0];

    const customVisualizationState = replaceLayerIdInVisualizationState(
      {
        ...matchingVisualizationState,
        ...customVisualization.visualizationState,
      },
      layerId
    );

    if (!areVisCompatible(matchingVisualizationState, customVisualizationState)) {
      console.log('custom vis was incompatible with current suggest');
      return currentSuggestion;
    }

    currentSuggestion = {
      ...matchingSuggestion,
      visualizationState: customVisualizationState,
    };

    console.log('merged suggestion', currentSuggestion.visualizationState);
  }

  return currentSuggestion;
};

function replaceLayerIdInVisualizationState(
  visualizationState: ExternalCustomVisualization['visualizationState'],
  newLayerId: string | undefined
): ExternalCustomVisualization['visualizationState'] {
  return {
    ...visualizationState,
    layerId: newLayerId,
    layers: visualizationState.layers?.map((layer) => ({ ...layer, layerId: newLayerId })),
  };
}

function areVisCompatible(
  matchingVisualizationState: ExternalCustomVisualization['visualizationState'],
  customVisualizationState: ExternalCustomVisualization['visualizationState']
): boolean {
  if (!matchingVisualizationState.layers?.length && !customVisualizationState.layers?.length) {
    return true;
  }
  if (matchingVisualizationState.layers?.length !== customVisualizationState.layers?.length) {
    return false;
  }
  const layerProps = ['layerType', 'seriesType', 'xAccessor'];
  return (matchingVisualizationState.layers || []).every((matchingVisLayer, index) => {
    const customVisLayer = customVisualizationState.layers?.[index];

    if (!customVisLayer) {
      return false;
    }

    return isEqual(pick(matchingVisLayer, layerProps), pick(customVisLayer, layerProps));
  });
}

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
