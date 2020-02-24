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

import 'uiExports/contextMenuActions';
import 'uiExports/devTools';
import 'uiExports/docViews';
import 'uiExports/embeddableActions';
import 'uiExports/fieldFormatEditors';
import 'uiExports/fieldFormats';
import 'uiExports/indexManagement';
import 'uiExports/inspectorViews';
import 'uiExports/savedObjectTypes';
import 'uiExports/search';
import 'uiExports/shareContextMenuExtensions';
import 'uiExports/visTypes';
import 'uiExports/visualize';

import { i18n } from '@kbn/i18n';

import chrome from 'ui/chrome';
import { npSetup, npStart } from 'ui/new_platform';

import { Legacy } from 'kibana';

import { SavedObjectAttributes } from 'kibana/server';
import {
  EmbeddableFactory,
  ErrorEmbeddable,
  Container,
  EmbeddableOutput,
} from '../../../../../plugins/embeddable/public';
import { start as visualizations } from '../../../visualizations/public/np_ready/public/legacy';
import { showNewVisModal } from '../visualize';
import { SavedVisualizations } from '../visualize/np_ready/types';
import { DisabledLabEmbeddable } from './disabled_lab_embeddable';
import { getIndexPattern } from './get_index_pattern';
import {
  VisualizeEmbeddable,
  VisualizeInput,
  VisualizeOutput,
  VisSavedObject,
} from './visualize_embeddable';
import { VISUALIZE_EMBEDDABLE_TYPE } from './constants';
import { TypesStart } from '../../../visualizations/public/np_ready/public/types';

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
  private readonly visTypes: TypesStart;

  static async createVisualizeEmbeddableFactory(): Promise<VisualizeEmbeddableFactory> {
    return new VisualizeEmbeddableFactory(visualizations.types);
  }

  constructor(visTypes: TypesStart) {
    super({
      savedObjectMetaData: {
        name: i18n.translate('kbn.visualize.savedObjectName', { defaultMessage: 'Visualization' }),
        includeFields: ['visState'],
        type: 'visualization',
        getIconForSavedObject: savedObject => {
          if (!visTypes) {
            return 'visualizeApp';
          }
          return (
            visTypes.get(JSON.parse(savedObject.attributes.visState).type).icon || 'visualizeApp'
          );
        },
        getTooltipForSavedObject: savedObject => {
          if (!visTypes) {
            return '';
          }
          return `${savedObject.attributes.title} (${
            visTypes.get(JSON.parse(savedObject.attributes.visState).type).title
          })`;
        },
        showSavedObject: savedObject => {
          if (!visTypes) {
            return false;
          }
          const typeName: string = JSON.parse(savedObject.attributes.visState).type;
          const visType = visTypes.get(typeName);
          if (!visType) {
            return false;
          }
          if (npStart.core.uiSettings.get('visualize:enableLabs')) {
            return true;
          }
          return visType.stage !== 'experimental';
        },
      },
    });

    this.visTypes = visTypes;
  }

  public isEditable() {
    return npStart.core.application.capabilities.visualize.save as boolean;
  }

  public getDisplayName() {
    return i18n.translate('kbn.embeddable.visualizations.displayName', {
      defaultMessage: 'visualization',
    });
  }

  public async createFromObject(
    savedObject: VisSavedObject,
    input: Partial<VisualizeInput> & { id: string },
    parent?: Container
  ): Promise<VisualizeEmbeddable | ErrorEmbeddable | DisabledLabEmbeddable> {
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const config = $injector.get<Legacy.KibanaConfig>('config');
    const savedVisualizations = $injector.get<SavedVisualizations>('savedVisualizations');

    try {
      const visId = savedObject.id as string;

      const editUrl = visId
        ? npStart.core.http.basePath.prepend(`/app/kibana${savedVisualizations.urlFor(visId)}`)
        : '';
      const isLabsEnabled = config.get<boolean>('visualize:enableLabs');

      if (!isLabsEnabled && savedObject.vis.type.stage === 'experimental') {
        return new DisabledLabEmbeddable(savedObject.title, input);
      }

      const indexPattern = await getIndexPattern(savedObject);
      const indexPatterns = indexPattern ? [indexPattern] : [];
      return new VisualizeEmbeddable(
        npStart.plugins.data.query.timefilter.timefilter,
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
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const savedVisualizations = $injector.get<SavedVisualizations>('savedVisualizations');

    try {
      const visId = savedObjectId;

      const savedObject = await savedVisualizations.get(visId);
      return this.createFromObject(savedObject, input, parent);
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
      return new ErrorEmbeddable(e, input, parent);
    }
  }

  public async create() {
    // TODO: This is a bit of a hack to preserve the original functionality. Ideally we will clean this up
    // to allow for in place creation of visualizations without having to navigate away to a new URL.
    if (this.visTypes) {
      showNewVisModal(
        this.visTypes,
        {
          editorParams: ['addToDashboard'],
        },
        npStart.core.http.basePath.prepend,
        npStart.core.uiSettings,
        npStart.core.savedObjects,
        npSetup.plugins.usageCollection
      );
    }
    return undefined;
  }
}
