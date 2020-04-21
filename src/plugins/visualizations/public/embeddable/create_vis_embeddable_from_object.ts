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

import { Vis } from '../types';
import { VisualizeInput, VisualizeEmbeddable } from './visualize_embeddable';
import { IContainer, ErrorEmbeddable } from '../../../../plugins/embeddable/public';
import { DisabledLabEmbeddable } from './disabled_lab_embeddable';
import {
  getSavedVisualizationsLoader,
  getUISettings,
  getHttp,
  getTimeFilter,
  getCapabilities,
  getUiActions,
} from '../services';
import { VisualizeEmbeddableFactoryDeps } from './visualize_embeddable_factory';

export const createVisEmbeddableFromObject = (deps: VisualizeEmbeddableFactoryDeps) => async (
  vis: Vis,
  input: Partial<VisualizeInput> & { id: string },
  parent?: IContainer
): Promise<VisualizeEmbeddable | ErrorEmbeddable | DisabledLabEmbeddable> => {
  const savedVisualizations = getSavedVisualizationsLoader();

  try {
    const visId = vis.id as string;

    const editUrl = visId
      ? getHttp().basePath.prepend(`/app/kibana${savedVisualizations.urlFor(visId)}`)
      : '';
    const isLabsEnabled = getUISettings().get<boolean>('visualize:enableLabs');

    if (!isLabsEnabled && vis.type.stage === 'experimental') {
      return new DisabledLabEmbeddable(vis.title, input);
    }

    const indexPattern = vis.data.indexPattern;
    const indexPatterns = indexPattern ? [indexPattern] : [];
    const editable = getCapabilities().visualize.save as boolean;
    return new VisualizeEmbeddable(
      getTimeFilter(),
      {
        vis,
        indexPatterns,
        editUrl,
        editable,
        uiActions: getUiActions(),
        deps,
      },
      input,
      parent
    );
  } catch (e) {
    console.error(e); // eslint-disable-line no-console
    return new ErrorEmbeddable(e, input, parent);
  }
};
