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
import { SavedObjectMetaData } from 'src/plugins/saved_objects/public';
import { first } from 'rxjs/operators';
import { SavedObjectAttributes } from '../../../../core/public';
import {
  EmbeddableFactoryDefinition,
  EmbeddableOutput,
  ErrorEmbeddable,
  IContainer,
} from '../../../embeddable/public';
import { DisabledLabEmbeddable } from './disabled_lab_embeddable';
import { VisualizeEmbeddable, VisualizeInput, VisualizeOutput } from './visualize_embeddable';
import { VISUALIZE_EMBEDDABLE_TYPE } from './constants';
import { SerializedVis, Vis } from '../vis';
import {
  getCapabilities,
  getTypes,
  getUISettings,
  getSavedVisualizationsLoader,
} from '../services';
import { showNewVisModal } from '../wizard';
import { convertToSerializedVis } from '../saved_visualizations/_saved_vis';
import { createVisEmbeddableFromObject } from './create_vis_embeddable_from_object';
import { StartServicesGetter } from '../../../kibana_utils/public';
import { VisualizationsStartDeps } from '../plugin';
import { VISUALIZE_ENABLE_LABS_SETTING } from '../../common/constants';

interface VisualizationAttributes extends SavedObjectAttributes {
  visState: string;
}

export interface VisualizeEmbeddableFactoryDeps {
  start: StartServicesGetter<Pick<VisualizationsStartDeps, 'inspector' | 'embeddable'>>;
}

export class VisualizeEmbeddableFactory
  implements
    EmbeddableFactoryDefinition<
      VisualizeInput,
      VisualizeOutput | EmbeddableOutput,
      VisualizeEmbeddable | DisabledLabEmbeddable,
      VisualizationAttributes
    > {
  public readonly type = VISUALIZE_EMBEDDABLE_TYPE;

  public readonly savedObjectMetaData: SavedObjectMetaData<VisualizationAttributes> = {
    name: i18n.translate('visualizations.savedObjectName', { defaultMessage: 'Visualization' }),
    includeFields: ['visState'],
    type: 'visualization',
    getIconForSavedObject: (savedObject) => {
      return (
        getTypes().get(JSON.parse(savedObject.attributes.visState).type).icon || 'visualizeApp'
      );
    },
    getTooltipForSavedObject: (savedObject) => {
      return `${savedObject.attributes.title} (${
        getTypes().get(JSON.parse(savedObject.attributes.visState).type).title
      })`;
    },
    showSavedObject: (savedObject) => {
      const typeName: string = JSON.parse(savedObject.attributes.visState).type;
      const visType = getTypes().get(typeName);
      if (!visType) {
        return false;
      }
      if (getUISettings().get(VISUALIZE_ENABLE_LABS_SETTING)) {
        return true;
      }
      return visType.stage !== 'experimental';
    },
  };

  constructor(private readonly deps: VisualizeEmbeddableFactoryDeps) {}

  public async isEditable() {
    return getCapabilities().visualize.save as boolean;
  }

  public getDisplayName() {
    return i18n.translate('visualizations.displayName', {
      defaultMessage: 'visualization',
    });
  }

  public async getCurrentAppId() {
    return await this.deps.start().core.application.currentAppId$.pipe(first()).toPromise();
  }

  public async createFromSavedObject(
    savedObjectId: string,
    input: Partial<VisualizeInput> & { id: string },
    parent?: IContainer
  ): Promise<VisualizeEmbeddable | ErrorEmbeddable | DisabledLabEmbeddable> {
    const savedVisualizations = getSavedVisualizationsLoader();

    try {
      const savedObject = await savedVisualizations.get(savedObjectId);
      const visState = convertToSerializedVis(savedObject);
      const vis = new Vis(savedObject.visState.type, visState);
      await vis.setState(visState);
      return createVisEmbeddableFromObject(this.deps)(vis, input, parent);
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
      return new ErrorEmbeddable(e, input, parent);
    }
  }

  public async create(input: VisualizeInput & { savedVis?: SerializedVis }, parent?: IContainer) {
    // TODO: This is a bit of a hack to preserve the original functionality. Ideally we will clean this up
    // to allow for in place creation of visualizations without having to navigate away to a new URL.
    if (input.savedVis) {
      const visState = input.savedVis;
      const vis = new Vis(visState.type, visState);
      await vis.setState(visState);
      return createVisEmbeddableFromObject(this.deps)(vis, input, parent);
    } else {
      showNewVisModal({
        originatingApp: await this.getCurrentAppId(),
        outsideVisualizeApp: true,
      });
      return undefined;
    }
  }
}
