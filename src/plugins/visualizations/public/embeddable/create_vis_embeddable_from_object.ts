/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { Vis } from '../types';
import type { VisualizeInput, VisualizeEmbeddable } from './visualize_embeddable';
import { getHttp, getTimeFilter, getCapabilities } from '../services';
import { urlFor } from '../utils/saved_visualize_utils';
import { VisualizeEmbeddableFactoryDeps } from './visualize_embeddable_factory';
import { createVisualizeEmbeddableAsync } from './visualize_embeddable_async';

export const createVisEmbeddableFromObject =
  (deps: VisualizeEmbeddableFactoryDeps) =>
  async (
    vis: Vis,
    input: Partial<VisualizeInput> & { id: string }
  ): Promise<VisualizeEmbeddable> => {
    const visId = vis.id as string;

    const editPath = visId ? urlFor(visId) : '#/edit_by_value';

    const editUrl = visId ? getHttp().basePath.prepend(`/app/visualize${urlFor(visId)}`) : '';

    let indexPatterns: DataView[] = [];

    if (vis.type.getUsedIndexPattern) {
      try {
        indexPatterns = await vis.type.getUsedIndexPattern(vis.params);
      } catch (e) {
        // nothing to be here
      }
    } else if (vis.data.indexPattern) {
      indexPatterns = [vis.data.indexPattern];
    }

    const capabilities = {
      visualizeSave: Boolean(getCapabilities().visualize.save),
      dashboardSave: Boolean(getCapabilities().dashboard?.showWriteControls),
      visualizeOpen: Boolean(getCapabilities().visualize?.show),
    };

    return createVisualizeEmbeddableAsync(
      getTimeFilter(),
      {
        vis,
        indexPatterns,
        editPath,
        editUrl,
        deps,
        capabilities,
      },
      input
    );
  };
