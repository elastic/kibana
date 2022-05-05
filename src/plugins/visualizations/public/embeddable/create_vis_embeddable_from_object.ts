/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IContainer, ErrorEmbeddable, AttributeService } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/public';
import { withHandlingMissedSavedObject } from './with_handling_missed_saved_object';
import { Vis } from '../types';
import type {
  VisualizeInput,
  VisualizeEmbeddable,
  VisualizeByValueInput,
  VisualizeByReferenceInput,
  VisualizeSavedObjectAttributes,
} from './visualize_embeddable';
import { DisabledLabEmbeddable } from './disabled_lab_embeddable';
import { getUISettings, getHttp, getTimeFilter, getCapabilities } from '../services';
import { SAVED_VIS_TYPE, urlFor } from '../utils/saved_visualize_utils';
import { VisualizeEmbeddableFactoryDeps } from './visualize_embeddable_factory';
import { VISUALIZE_ENABLE_LABS_SETTING } from '../../common/constants';
import { createVisualizeEmbeddableAsync } from './visualize_embeddable_async';

export const createVisEmbeddableFromObject =
  (deps: VisualizeEmbeddableFactoryDeps) =>
  async (
    vis: Vis,
    input: Partial<VisualizeInput> & { id: string },
    attributeService?: AttributeService<
      VisualizeSavedObjectAttributes,
      VisualizeByValueInput,
      VisualizeByReferenceInput
    >,
    parent?: IContainer
  ): Promise<VisualizeEmbeddable | ErrorEmbeddable | DisabledLabEmbeddable> => {
    try {
      const visId = vis.id as string;
      const editPath = visId ? urlFor(visId) : '#/edit_by_value';
      const editUrl = visId ? getHttp().basePath.prepend(`/app/visualize${urlFor(visId)}`) : '';
      const isLabsEnabled = getUISettings().get<boolean>(VISUALIZE_ENABLE_LABS_SETTING);

      if (!isLabsEnabled && vis.type.stage === 'experimental') {
        return new DisabledLabEmbeddable(vis.title, input);
      }

      const startDeps = await deps.start();

      return await withHandlingMissedSavedObject(
        startDeps.core,
        async () => {
          let indexPatterns: DataView[] = [];

          if (vis.type.getUsedIndexPattern) {
            indexPatterns = await vis.type.getUsedIndexPattern(vis.params);
          } else if (vis.data.indexPattern) {
            indexPatterns = [vis.data.indexPattern];
          }

          const capabilities = {
            visualizeSave: Boolean(getCapabilities().visualize.save),
            dashboardSave: Boolean(getCapabilities().dashboard?.showWriteControls),
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
            input,
            attributeService,
            parent
          );
        },
        input,
        parent,
        visId ? { id: visId, type: SAVED_VIS_TYPE } : { id: parent?.id ?? '', type: 'dashboard' },
        { type: DATA_VIEW_SAVED_OBJECT_TYPE }
      );
    } catch (e) {
      return e instanceof ErrorEmbeddable ? e : new ErrorEmbeddable(e, input, parent);
    }
  };
