/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { SavedObjectMetaData, OnSaveProps } from 'src/plugins/saved_objects/public';
import { first } from 'rxjs/operators';
import { EmbeddableStateWithType } from 'src/plugins/embeddable/common';
import { SavedObjectAttributes } from '../../../../core/public';
import { extractSearchSourceReferences } from '../../../data/public';
import { SavedObjectReference } from '../../../../core/public';

import {
  EmbeddableFactoryDefinition,
  EmbeddableOutput,
  ErrorEmbeddable,
  IContainer,
  AttributeService,
} from '../../../embeddable/public';
import { DisabledLabEmbeddable } from './disabled_lab_embeddable';
import {
  VisualizeByReferenceInput,
  VisualizeByValueInput,
  VisualizeEmbeddable,
  VisualizeInput,
  VisualizeOutput,
  VisualizeSavedObjectAttributes,
} from './visualize_embeddable';
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
import {
  extractControlsReferences,
  extractTimeSeriesReferences,
  injectTimeSeriesReferences,
  injectControlsReferences,
} from '../saved_visualizations/saved_visualization_references';
import { createVisEmbeddableFromObject } from './create_vis_embeddable_from_object';
import { StartServicesGetter } from '../../../kibana_utils/public';
import { VisualizationsStartDeps } from '../plugin';
import { VISUALIZE_ENABLE_LABS_SETTING } from '../../common/constants';
import { checkForDuplicateTitle } from '../../../saved_objects/public';

interface VisualizationAttributes extends SavedObjectAttributes {
  visState: string;
}

export interface VisualizeEmbeddableFactoryDeps {
  start: StartServicesGetter<
    Pick<VisualizationsStartDeps, 'inspector' | 'embeddable' | 'savedObjectsClient'>
  >;
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

  private attributeService?: AttributeService<
    VisualizeSavedObjectAttributes,
    VisualizeByValueInput,
    VisualizeByReferenceInput
  >;

  public readonly savedObjectMetaData: SavedObjectMetaData<VisualizationAttributes> = {
    name: i18n.translate('visualizations.savedObjectName', { defaultMessage: 'Visualization' }),
    includeFields: ['visState'],
    type: 'visualization',
    getIconForSavedObject: (savedObject) => {
      return (
        getTypes().get(JSON.parse(savedObject.attributes.visState).type)?.icon || 'visualizeApp'
      );
    },
    getTooltipForSavedObject: (savedObject) => {
      return `${savedObject.attributes.title} (${
        getTypes().get(JSON.parse(savedObject.attributes.visState).type)?.title
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

  private async getAttributeService() {
    if (!this.attributeService) {
      this.attributeService = await this.deps
        .start()
        .plugins.embeddable.getAttributeService<
          VisualizeSavedObjectAttributes,
          VisualizeByValueInput,
          VisualizeByReferenceInput
        >(this.type, {
          saveMethod: this.saveMethod.bind(this),
          checkForDuplicateTitle: this.checkTitle.bind(this),
        });
    }
    return this.attributeService!;
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
      return createVisEmbeddableFromObject(this.deps)(
        vis,
        input,
        savedVisualizations,
        await this.getAttributeService(),
        parent
      );
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
      return new ErrorEmbeddable(e, input, parent);
    }
  }

  public async create(
    input: VisualizeInput & { savedVis?: SerializedVis; newVisType?: string },
    parent?: IContainer
  ) {
    // TODO: This is a bit of a hack to preserve the original functionality. Ideally we will clean this up
    // to allow for in place creation of visualizations without having to navigate away to a new URL.
    if (input.savedVis) {
      const visState = input.savedVis;
      const vis = new Vis(visState.type, visState);
      await vis.setState(visState);
      const savedVisualizations = getSavedVisualizationsLoader();
      return createVisEmbeddableFromObject(this.deps)(
        vis,
        input,
        savedVisualizations,
        await this.getAttributeService(),
        parent
      );
    } else {
      showNewVisModal({
        originatingApp: await this.getCurrentAppId(),
        outsideVisualizeApp: true,
        newVisType: input?.newVisType,
      });
      return undefined;
    }
  }

  private async saveMethod(attributes: VisualizeSavedObjectAttributes): Promise<{ id: string }> {
    try {
      const { title, savedVis } = attributes;
      const visObj = attributes.vis;
      if (!savedVis) {
        throw new Error('No Saved Vis');
      }
      const saveOptions = {
        confirmOverwrite: false,
        returnToOrigin: true,
        isTitleDuplicateConfirmed: true,
      };
      savedVis.title = title;
      savedVis.copyOnSave = false;
      savedVis.description = '';
      savedVis.searchSourceFields = visObj?.data.searchSource?.getSerializedFields();
      const serializedVis = ((visObj as unknown) as Vis).serialize();
      const { params, data } = serializedVis;
      savedVis.visState = {
        title,
        type: serializedVis.type,
        params,
        aggs: data.aggs,
      };
      if (visObj) {
        savedVis.uiStateJSON = visObj?.uiState.toString();
      }
      const id = await savedVis.save(saveOptions);
      if (!id || id === '') {
        throw new Error(
          i18n.translate('visualizations.savingVisualizationFailed.errorMsg', {
            defaultMessage: 'Saving a visualization failed',
          })
        );
      }
      return { id };
    } catch (error) {
      throw error;
    }
  }

  public async checkTitle(props: OnSaveProps): Promise<true> {
    const savedObjectsClient = await this.deps.start().core.savedObjects.client;
    const overlays = await this.deps.start().core.overlays;
    return checkForDuplicateTitle(
      {
        title: props.newTitle,
        copyOnSave: false,
        lastSavedTitle: '',
        getEsType: () => this.type,
        getDisplayName: this.getDisplayName || (() => this.type),
      },
      props.isTitleDuplicateConfirmed,
      props.onTitleDuplicate,
      {
        savedObjectsClient,
        overlays,
      }
    );
  }

  public inject(_state: EmbeddableStateWithType, references: SavedObjectReference[]) {
    const state = (_state as unknown) as VisualizeInput;

    const { type, params } = state.savedVis ?? {};

    if (type && params) {
      injectControlsReferences(type, params, references);
      injectTimeSeriesReferences(type, params, references);
    }

    return _state;
  }

  public extract(_state: EmbeddableStateWithType) {
    const state = (_state as unknown) as VisualizeInput;
    const references = [];

    if (state.savedVis?.data.searchSource) {
      const [, searchSourceReferences] = extractSearchSourceReferences(
        state.savedVis.data.searchSource
      );

      references.push(...searchSourceReferences);
    }

    if (state.savedVis?.data.savedSearchId) {
      references.push({
        name: 'search_0',
        type: 'search',
        id: String(state.savedVis.data.savedSearchId),
      });
    }

    const { type, params } = state.savedVis ?? {};

    if (type && params) {
      extractControlsReferences(type, params, references, `control_${state.id}`);
      extractTimeSeriesReferences(type, params, references, `metrics_${state.id}`);
    }

    return { state: _state, references };
  }
}
