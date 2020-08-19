/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
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
import { createSavedSearchesLoader } from '../../../../discover/public';
import { VisualizeServices } from '../types';

const createVisualizeEmbeddableAndLinkSavedSearch = async (
  vis: Vis,
  visualizeServices: VisualizeServices
) => {
  const {
    chrome,
    data,
    overlays,
    createVisEmbeddableFromObject,
    savedObjects,
    toastNotifications,
  } = visualizeServices;
  const embeddableHandler = (await createVisEmbeddableFromObject(vis, {
    timeRange: data.query.timefilter.timefilter.getTime(),
    filters: data.query.filterManager.getFilters(),
    id: '',
  })) as VisualizeEmbeddableContract;

  embeddableHandler.getOutput$().subscribe((output) => {
    if (output.error) {
      toastNotifications.addError(output.error, {
        title: i18n.translate('visualize.error.title', {
          defaultMessage: 'Visualization error',
        }),
      });
    }
  });

  let savedSearch: SavedObject | undefined;

  if (vis.data.savedSearchId) {
    savedSearch = await createSavedSearchesLoader({
      savedObjectsClient: savedObjects.client,
      indexPatterns: data.indexPatterns,
      search: data.search,
      chrome,
      overlays,
    }).get(vis.data.savedSearchId);
  }

  return { savedSearch, embeddableHandler };
};

export const getVisualizationInstanceFromInput = async (
  visualizeServices: VisualizeServices,
  input: VisualizeInput
) => {
  const { visualizations } = visualizeServices;
  const visState = input.savedVis as SerializedVis;
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
