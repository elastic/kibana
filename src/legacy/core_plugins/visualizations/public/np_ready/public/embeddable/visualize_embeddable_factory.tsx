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
import { SavedObjectAttributes } from '../../../../../../../core/public';
import {
  Container,
  EmbeddableFactory,
  EmbeddableOutput,
  ErrorEmbeddable,
} from '../../../../../../../plugins/embeddable/public';
import { DisabledLabEmbeddable } from './disabled_lab_embeddable';
import { getIndexPattern } from './get_index_pattern';
import { VisualizeEmbeddable, VisualizeInput, VisualizeOutput } from './visualize_embeddable';
import { VISUALIZE_EMBEDDABLE_TYPE } from './constants';
import {
  getCapabilities,
  getTypes,
  getUISettings,
  getSavedVisualizationsLoader,
  getTimeFilter,
} from '../services';
import { showNewVisModal } from '../wizard';
import { getVisPanel, VisWithData } from '../saved_visualizations/_saved_vis';

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

  constructor() {
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
    { vis, searchSource }: VisWithData,
    input: Partial<VisualizeInput> & { id: string },
    parent?: Container
  ): Promise<VisualizeEmbeddable | ErrorEmbeddable | DisabledLabEmbeddable> {
    try {
      const editUrl = '';
      const isLabsEnabled = getUISettings().get<boolean>('visualize:enableLabs');

      if (!isLabsEnabled && vis.type.stage === 'experimental') {
        return new DisabledLabEmbeddable(vis.title, input);
      }

      const indexPattern = await getIndexPattern(vis);
      const indexPatterns = indexPattern ? [indexPattern] : [];
      return new VisualizeEmbeddable(
        getTimeFilter(),
        {
          visWithData: {
            vis,
            searchSource,
          },
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
    const savedVisualizations = getSavedVisualizationsLoader();

    try {
      const savedObject = await savedVisualizations.get(savedObjectId);
      const visWithData = await getVisPanel(savedObject);
      return this.createFromObject(visWithData, input, parent);
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
      return new ErrorEmbeddable(e, input, parent);
    }
  }

  public async create(input: any, parent?: Container) {
    if (input && input.visState) {
      return this.createFromObject(await getVisPanel(input), input, parent)
    }
    // TODO: visualize embeddable is currently hardcoded to redirect back to current dashboard, we should make this configurable
    showNewVisModal({
      editorParams: {
        inlineEditor: true,
        redirectToApp: 'kibana',
        redirectToPath: (new URLSearchParams(`#/dashboard?addEmbeddableType=visualization%26embeddableState=`)).toString(),
      },
    });
    return undefined;
  }
}
