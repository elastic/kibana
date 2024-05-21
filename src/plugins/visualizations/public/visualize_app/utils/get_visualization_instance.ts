/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { cloneDeep } from 'lodash';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { createVisAsync } from '../../vis_async';
import { convertToSerializedVis, getSavedVisualization } from '../../utils/saved_visualize_utils';
import { SerializedVis, Vis, VisSavedObject, VisualizeInput } from '../..';
import type { VisInstance, VisualizeServices } from '../types';

const createLinkedSavedSearch = async (vis: Vis, visualizeServices: VisualizeServices) => {
  const { savedSearch: savedSearchApi } = visualizeServices;

  let savedSearch: SavedSearch | undefined;

  if (vis.data.savedSearchId) {
    try {
      savedSearch = vis.data.savedSearchId
        ? await savedSearchApi.get(vis.data.savedSearchId)
        : await savedSearchApi.getNew();
    } catch (e) {
      // skip this catch block
    }
  }

  return { savedSearch };
};

export const getVisualizationInstanceFromInput = async (
  visualizeServices: VisualizeServices,
  input: VisualizeInput
) => {
  const { data, spaces, savedObjectsTagging, ...startServices } = visualizeServices;
  const visState = input.savedVis as SerializedVis;

  /**
   * A saved vis is needed even in by value mode to support 'save to library' which converts the 'by value'
   * state of the visualization, into a new saved object.
   */
  const savedVis: VisSavedObject = await getSavedVisualization({
    search: data.search,
    spaces,
    savedObjectsTagging,
    ...startServices,
  });

  if (visState.uiState && Object.keys(visState.uiState).length !== 0) {
    savedVis.uiStateJSON = JSON.stringify(visState.uiState);
  }

  let vis = await createVisAsync(visState.type, cloneDeep(visState));
  if (vis.type.setup) {
    try {
      vis = await vis.type.setup(vis);
    } catch {
      // skip this catch block
    }
  }

  const { savedSearch } = await createLinkedSavedSearch(vis, visualizeServices);
  return {
    vis,
    savedVis,
    savedSearch,
    panelTitle: input?.title ?? '',
    panelDescription: input?.description ?? '',
    panelTimeRange: input?.timeRange ?? undefined,
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
): Promise<VisInstance> => {
  const { data, spaces, savedObjectsTagging, ...startServices } = visualizeServices;

  const savedVis: VisSavedObject = await getSavedVisualization(
    {
      search: data.search,
      spaces,
      savedObjectsTagging,
      ...startServices,
    },
    opts
  );

  if (typeof opts !== 'string') {
    savedVis.searchSourceFields = { index: opts?.indexPattern } as SerializedSearchSourceFields;
  }
  const serializedVis = convertToSerializedVis(savedVis);
  let vis = await createVisAsync(serializedVis.type, serializedVis);
  if (vis.type.setup) {
    try {
      vis = await vis.type.setup(vis);
    } catch {
      // skip this catch block
    }
  }

  const { savedSearch } = await createLinkedSavedSearch(vis, visualizeServices);
  return {
    vis,
    savedSearch,
    savedVis,
  };
};
