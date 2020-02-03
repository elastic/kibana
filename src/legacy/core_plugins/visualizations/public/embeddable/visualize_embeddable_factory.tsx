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
import { SavedObjectAttributes } from 'kibana/public';
import {
  EmbeddableFactory,
  ErrorEmbeddable,
  Container,
  EmbeddableOutput,
} from '../../../../../plugins/embeddable/public';
import { showNewVisModal } from '../../../kibana/public/visualize';
import { SavedVisualizations } from '../../../kibana/public/visualize/np_ready/types';
import { DisabledLabEmbeddable } from './disabled_lab_embeddable';
import { getIndexPattern } from './get_index_pattern';
import {
  VisualizeEmbeddable,
  VisualizeInput,
  VisualizeOutput,
  VisSavedObject,
} from './visualize_embeddable';
import { VISUALIZE_EMBEDDABLE_TYPE } from './constants';

import {
  getUISettings,
  getCapabilities,
  getHttp,
  getTypes,
  getSavedObjects,
  getUsageCollector,
} from '../np_ready/public/services';

interface VisualizationAttributes extends SavedObjectAttributes {
  visState: string;
}

export class VisualizeEmbeddableFactory extends EmbeddableFactory<
  VisualizeInput,
  VisualizeOutput | EmbeddableOutput,
  VisualizeEmbeddable | DisabledLabEmbeddable,
  VisualizationAttributes
> {
  public readonly type = VISUALIZE_EMBEDDABLE_TYPE;

  constructor(private getSavedVisualizationsLoader: () => SavedVisualizations) {
    super({
      savedObjectMetaData: {
        name: i18n.translate('visualizations.savedObjectName', { defaultMessage: 'Visualization' }),
        includeFields: ['visState'],
        type: 'visualization',
        getIconForSavedObject: savedObject => {
          return (
            getTypes().get(JSON.parse(savedObject.attributes.visState).type).icon || 'visualizeApp'
          );
        },
        getTooltipForSavedObject: savedObject => {
          return `${savedObject.attributes.title} (${
            getTypes().get(JSON.parse(savedObject.attributes.visState).type).title
          })`;
        },
        showSavedObject: savedObject => {
          const typeName: string = JSON.parse(savedObject.attributes.visState).type;
          const visType = getTypes().get(typeName);
          if (!visType) {
            return false;
          }
          if (getUISettings().get('visualize:enableLabs')) {
            return true;
          }
          return visType.stage !== 'experimental';
        },
      },
    });
  }

  public isEditable() {
    return getCapabilities().visualize.save as boolean;
  }

  public getDisplayName() {
    return i18n.translate('visualizations.displayName', {
      defaultMessage: 'visualization',
    });
  }

  public async createFromObject(
    savedObject: VisSavedObject,
    input: Partial<VisualizeInput> & { id: string },
    parent?: Container
  ): Promise<VisualizeEmbeddable | ErrorEmbeddable | DisabledLabEmbeddable> {
    const savedVisualizations = this.getSavedVisualizationsLoader();

    try {
      const visId = savedObject.id as string;

      const editUrl = visId
        ? getHttp().basePath.prepend(`/app/kibana${savedVisualizations.urlFor(visId)}`)
        : '';
      const isLabsEnabled = getUISettings().get<boolean>('visualize:enableLabs');

      if (!isLabsEnabled && savedObject.vis.type.stage === 'experimental') {
        return new DisabledLabEmbeddable(savedObject.title, input);
      }

      const indexPattern = await getIndexPattern(savedObject);
      const indexPatterns = indexPattern ? [indexPattern] : [];
      return new VisualizeEmbeddable(
        {
          savedVisualization: savedObject,
          indexPatterns,
          editUrl,
          editable: this.isEditable(),
          appState: input.appState,
          uiState: input.uiState,
        },
        input,
        parent
      );
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
      return new ErrorEmbeddable(e, input, parent);
    }
  }

  public async createFromSavedObject(
    savedObjectId: string,
    input: Partial<VisualizeInput> & { id: string },
    parent?: Container
  ): Promise<VisualizeEmbeddable | ErrorEmbeddable | DisabledLabEmbeddable> {
    const savedVisualizations = this.getSavedVisualizationsLoader();

    try {
      const savedObject = await savedVisualizations.get(savedObjectId);
      return this.createFromObject(savedObject, input, parent);
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
      return new ErrorEmbeddable(e, input, parent);
    }
  }

  public async create() {
    // TODO: This is a bit of a hack to preserve the original functionality. Ideally we will clean this up
    // to allow for in place creation of visualizations without having to navigate away to a new URL.
    showNewVisModal(
      getTypes(),
      {
        editorParams: ['addToDashboard'],
      },
      getHttp().basePath.prepend,
      getUISettings(),
      getSavedObjects(),
      getUsageCollector()
    );
    return undefined;
  }
}
