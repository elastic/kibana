/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IndexPattern } from '../../../data/common/index_patterns/index_patterns/index_pattern';
import { AttributeService } from '../../../embeddable/public/lib/attribute_service/attribute_service';
import type { IContainer } from '../../../embeddable/public/lib/containers/i_container';
import { ErrorEmbeddable } from '../../../embeddable/public/lib/embeddables/error_embeddable';
import { VISUALIZE_ENABLE_LABS_SETTING } from '../../common/constants';
import type { SavedVisualizationsLoader } from '../saved_visualizations/saved_visualizations';
import {
  getCapabilities,
  getHttp,
  getSavedVisualizationsLoader,
  getTimeFilter,
  getUISettings,
} from '../services';
import { Vis } from '../vis';
import { DisabledLabEmbeddable } from './disabled_lab_embeddable';
import type {
  VisualizeByReferenceInput,
  VisualizeByValueInput,
  VisualizeInput,
  VisualizeSavedObjectAttributes,
} from './visualize_embeddable';
import { VisualizeEmbeddable } from './visualize_embeddable';
import { createVisualizeEmbeddableAsync } from './visualize_embeddable_async';
import type { VisualizeEmbeddableFactoryDeps } from './visualize_embeddable_factory';

export const createVisEmbeddableFromObject = (deps: VisualizeEmbeddableFactoryDeps) => async (
  vis: Vis,
  input: Partial<VisualizeInput> & { id: string },
  savedVisualizationsLoader?: SavedVisualizationsLoader,
  attributeService?: AttributeService<
    VisualizeSavedObjectAttributes,
    VisualizeByValueInput,
    VisualizeByReferenceInput
  >,
  parent?: IContainer
): Promise<VisualizeEmbeddable | ErrorEmbeddable | DisabledLabEmbeddable> => {
  const savedVisualizations = getSavedVisualizationsLoader();

  try {
    const visId = vis.id as string;

    const editPath = visId ? savedVisualizations.urlFor(visId) : '#/edit_by_value';

    const editUrl = visId
      ? getHttp().basePath.prepend(`/app/visualize${savedVisualizations.urlFor(visId)}`)
      : '';
    const isLabsEnabled = getUISettings().get<boolean>(VISUALIZE_ENABLE_LABS_SETTING);

    if (!isLabsEnabled && vis.type.stage === 'experimental') {
      return new DisabledLabEmbeddable(vis.title, input);
    }

    let indexPatterns: IndexPattern[] = [];

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
      savedVisualizationsLoader,
      parent
    );
  } catch (e) {
    console.error(e); // eslint-disable-line no-console
    return new ErrorEmbeddable(e, input, parent);
  }
};
