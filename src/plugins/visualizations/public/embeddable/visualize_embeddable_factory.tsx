/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { first } from 'rxjs/operators';
import type {
  SavedObjectAttributes,
  SavedObjectReference,
} from '../../../../core/types/saved_objects';
import { extractSearchSourceReferences } from '../../../data/common/search/search_source/extract_references';
import type { EmbeddableStateWithType } from '../../../embeddable/common/types';
import { AttributeService } from '../../../embeddable/public/lib/attribute_service/attribute_service';
import type { IContainer } from '../../../embeddable/public/lib/containers/i_container';
import type { EmbeddableFactoryDefinition } from '../../../embeddable/public/lib/embeddables/embeddable_factory_definition';
import { ErrorEmbeddable } from '../../../embeddable/public/lib/embeddables/error_embeddable';
import type { EmbeddableOutput } from '../../../embeddable/public/lib/embeddables/i_embeddable';
import type { StartServicesGetter } from '../../../kibana_utils/public/core/create_start_service_getter';
import type { SavedObjectMetaData } from '../../../saved_objects/public/finder/saved_object_finder';
import { checkForDuplicateTitle } from '../../../saved_objects/public/saved_object/helpers/check_for_duplicate_title';
import type { OnSaveProps } from '../../../saved_objects/public/save_modal/saved_object_save_modal';
import { VISUALIZE_ENABLE_LABS_SETTING } from '../../common/constants';
import type { VisualizationsStartDeps } from '../plugin';
import {
  extractControlsReferences,
  injectControlsReferences,
} from '../saved_visualizations/saved_visualization_references/controls_references';
import {
  extractTimeSeriesReferences,
  injectTimeSeriesReferences,
} from '../saved_visualizations/saved_visualization_references/timeseries_references';
import { convertToSerializedVis } from '../saved_visualizations/_saved_vis';
import {
  getCapabilities,
  getSavedVisualizationsLoader,
  getTypes,
  getUISettings,
} from '../services';
import type { SerializedVis } from '../vis';
import { Vis } from '../vis';
import { createVisAsync } from '../vis_async';
import { showNewVisModal } from '../wizard/show_new_vis';
import { VISUALIZE_EMBEDDABLE_TYPE } from './constants';
import { createVisEmbeddableFromObject } from './create_vis_embeddable_from_object';
import { DisabledLabEmbeddable } from './disabled_lab_embeddable';
import type {
  VisualizeByReferenceInput,
  VisualizeByValueInput,
  VisualizeInput,
  VisualizeOutput,
  VisualizeSavedObjectAttributes,
} from './visualize_embeddable';
import { VisualizeEmbeddable } from './visualize_embeddable';

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
    getSavedObjectSubType: (savedObject) => {
      return JSON.parse(savedObject.attributes.visState).type;
    },
  };

  constructor(private readonly deps: VisualizeEmbeddableFactoryDeps) {}

  public async isEditable() {
    return getCapabilities().visualize.save as boolean;
  }

  public getDisplayName() {
    return i18n.translate('visualizations.displayName', {
      defaultMessage: 'Visualization',
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
      const vis = await createVisAsync(savedObject.visState.type, visState);

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

  public async create(input: VisualizeInput & { savedVis?: SerializedVis }, parent?: IContainer) {
    // TODO: This is a bit of a hack to preserve the original functionality. Ideally we will clean this up
    // to allow for in place creation of visualizations without having to navigate away to a new URL.
    if (input.savedVis) {
      const visState = input.savedVis;
      const vis = await createVisAsync(visState.type, visState);
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
