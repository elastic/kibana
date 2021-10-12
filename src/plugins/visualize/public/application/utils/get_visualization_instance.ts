/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SerializedVis,
  Vis,
  VisSavedObject,
  VisualizeEmbeddableContract,
  VisualizeInput,
} from 'src/plugins/visualizations/public';
import { SearchSourceFields } from 'src/plugins/data/public';
import { SavedObject } from 'src/plugins/saved_objects/public';
import { cloneDeep } from 'lodash';
import { ExpressionValueError } from 'src/plugins/expressions/public';
import { createSavedSearchesLoader } from '../../../../discover/public';
import { SavedFieldNotFound, SavedFieldTypeInvalidForAgg } from '../../../../kibana_utils/common';
import { VisualizeServices } from '../types';

function isErrorRelatedToRuntimeFields(error: ExpressionValueError['error']) {
  const originalError = error.original || error;
  return (
    originalError instanceof SavedFieldNotFound ||
    originalError instanceof SavedFieldTypeInvalidForAgg
  );
}

const createVisualizeEmbeddableAndLinkSavedSearch = async (
  vis: Vis,
  visualizeServices: VisualizeServices
) => {
  const { data, createVisEmbeddableFromObject, savedObjects, savedObjectsPublic } =
    visualizeServices;
  const embeddableHandler = (await createVisEmbeddableFromObject(vis, {
    id: '',
    timeRange: data.query.timefilter.timefilter.getTime(),
    filters: data.query.filterManager.getFilters(),
    searchSessionId: data.search.session.getSessionId(),
  })) as VisualizeEmbeddableContract;

  embeddableHandler.getOutput$().subscribe((output) => {
    if (output.error && !isErrorRelatedToRuntimeFields(output.error)) {
      data.search.showError(
        (output.error as unknown as ExpressionValueError['error']).original || output.error
      );
    }
  });

  let savedSearch: SavedObject | undefined;

  if (vis.data.savedSearchId) {
    savedSearch = await createSavedSearchesLoader({
      savedObjectsClient: savedObjects.client,
      savedObjects: savedObjectsPublic,
    }).get(vis.data.savedSearchId);
  }

  return { savedSearch, embeddableHandler };
};

export const getVisualizationInstanceFromInput = async (
  visualizeServices: VisualizeServices,
  input: VisualizeInput
) => {
  const { visualizations, savedVisualizations } = visualizeServices;
  const visState = input.savedVis as SerializedVis;

  /**
   * A saved vis is needed even in by value mode to support 'save to library' which converts the 'by value'
   * state of the visualization, into a new saved object.
   */
  const savedVis: VisSavedObject = await savedVisualizations.get();
  if (visState.uiState && Object.keys(visState.uiState).length !== 0) {
    savedVis.uiStateJSON = JSON.stringify(visState.uiState);
  }

  let vis = await visualizations.createVis(visState.type, cloneDeep(visState));
  if (vis.type.setup) {
    try {
      vis = await vis.type.setup(vis);
    } catch {
      // skip this catch block
    }
  }
  const { embeddableHandler, savedSearch } = await createVisualizeEmbeddableAndLinkSavedSearch(
    vis,
    visualizeServices
  );
  return {
    vis,
    savedVis,
    embeddableHandler,
    savedSearch,
  };
};

export const getVisualizationInstance = async (
  visualizeServices: VisualizeServices,
  /**
   * opts can be either a saved visualization id passed as string,
   * or an object of new visualization params.
   * Both come from url search query
   */
  opts?: Record<string, unknown> | string
) => {
  const { visualizations, savedVisualizations } = visualizeServices;
  const savedVis: VisSavedObject = await savedVisualizations.get(opts);

  if (typeof opts !== 'string') {
    savedVis.searchSourceFields = { index: opts?.indexPattern } as SearchSourceFields;
  }
  const serializedVis = visualizations.convertToSerializedVis(savedVis);
  let vis = await visualizations.createVis(serializedVis.type, serializedVis);
  if (vis.type.setup) {
    try {
      vis = await vis.type.setup(vis);
    } catch {
      // skip this catch block
    }
  }

  const { embeddableHandler, savedSearch } = await createVisualizeEmbeddableAndLinkSavedSearch(
    vis,
    visualizeServices
  );
  return {
    vis,
    embeddableHandler,
    savedSearch,
    savedVis,
  };
};
