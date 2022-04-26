/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { first } from 'rxjs/operators';
import type { SavedObjectMetaData, OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';

import {
  injectSearchSourceReferences,
  extractSearchSourceReferences,
  SerializedSearchSourceFields,
} from '@kbn/data-plugin/public';
import type { SavedObjectAttributes, SavedObjectReference } from '@kbn/core/public';

import {
  EmbeddableFactoryDefinition,
  EmbeddableOutput,
  ErrorEmbeddable,
  IContainer,
  AttributeService,
} from '@kbn/embeddable-plugin/public';
import { checkForDuplicateTitle } from '@kbn/saved-objects-plugin/public';
import type { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import type { DisabledLabEmbeddable } from './disabled_lab_embeddable';
import type {
  VisualizeByReferenceInput,
  VisualizeByValueInput,
  VisualizeEmbeddable,
  VisualizeInput,
  VisualizeOutput,
  VisualizeSavedObjectAttributes,
} from './visualize_embeddable';
import { VISUALIZE_EMBEDDABLE_TYPE } from './constants';
import type { SerializedVis, Vis } from '../vis';
import { createVisAsync } from '../vis_async';
import { getCapabilities, getTypes, getUISettings } from '../services';
import { showNewVisModal } from '../wizard';
import {
  convertToSerializedVis,
  getSavedVisualization,
  saveVisualization,
  getFullPath,
} from '../utils/saved_visualize_utils';
import {
  extractControlsReferences,
  extractTimeSeriesReferences,
  injectTimeSeriesReferences,
  injectControlsReferences,
} from '../utils/saved_visualization_references';
import { createVisEmbeddableFromObject } from './create_vis_embeddable_from_object';
import { VISUALIZE_ENABLE_LABS_SETTING } from '../../common/constants';
import type { VisualizationsStartDeps } from '../plugin';

interface VisualizationAttributes extends SavedObjectAttributes {
  visState: string;
}

export interface VisualizeEmbeddableFactoryDeps {
  start: StartServicesGetter<
    Pick<
      VisualizationsStartDeps,
      | 'inspector'
      | 'embeddable'
      | 'savedObjectsClient'
      | 'data'
      | 'savedObjectsTaggingOss'
      | 'spaces'
    >
  >;
}

export class VisualizeEmbeddableFactory
  implements
    EmbeddableFactoryDefinition<
      VisualizeInput,
      VisualizeOutput | EmbeddableOutput,
      VisualizeEmbeddable | DisabledLabEmbeddable,
      VisualizationAttributes
    >
{
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
      try {
        const typeName: string = JSON.parse(savedObject.attributes.visState).type;
        const visType = getTypes().get(typeName);
        if (!visType) {
          return false;
        }
        if (getUISettings().get(VISUALIZE_ENABLE_LABS_SETTING)) {
          return true;
        }
        return visType.stage !== 'experimental';
      } catch {
        return false;
      }
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
    const startDeps = await this.deps.start();

    try {
      const savedObject = await getSavedVisualization(
        {
          savedObjectsClient: startDeps.core.savedObjects.client,
          search: startDeps.plugins.data.search,
          dataViews: startDeps.plugins.data.dataViews,
          spaces: startDeps.plugins.spaces,
          savedObjectsTagging: startDeps.plugins.savedObjectsTaggingOss?.getTaggingApi(),
        },
        savedObjectId
      );

      if (savedObject.sharingSavedObjectProps?.outcome === 'conflict') {
        return new ErrorEmbeddable(
          i18n.translate('visualizations.embeddable.legacyURLConflict.errorMessage', {
            defaultMessage: `This visualization has the same URL as a legacy alias. Disable the alias to resolve this error : {json}`,
            values: { json: savedObject.sharingSavedObjectProps?.errorJSON },
          }),
          input,
          parent
        );
      }
      const visState = convertToSerializedVis(savedObject);
      const vis = await createVisAsync(savedObject.visState.type, visState);

      return createVisEmbeddableFromObject(this.deps)(
        vis,
        input,
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
      return createVisEmbeddableFromObject(this.deps)(
        vis,
        input,
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
        copyOnSave: false,
      };
      savedVis.title = title;
      savedVis.description = '';
      savedVis.searchSourceFields = visObj?.data.searchSource?.getSerializedFields();
      savedVis.savedSearchId = visObj?.data.savedSearchId;
      const serializedVis = (visObj as unknown as Vis).serialize();
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
      const { core, plugins } = await this.deps.start();
      const id = await saveVisualization(savedVis, saveOptions, {
        savedObjectsClient: core.savedObjects.client,
        overlays: core.overlays,
        savedObjectsTagging: plugins.savedObjectsTaggingOss?.getTaggingApi(),
      });
      if (!id || id === '') {
        throw new Error(
          i18n.translate('visualizations.savingVisualizationFailed.errorMsg', {
            defaultMessage: 'Saving a visualization failed',
          })
        );
      }
      core.chrome.recentlyAccessed.add(getFullPath(id), savedVis.title, String(id));
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
    let state = _state as unknown as VisualizeInput;

    const { type, params } = state.savedVis ?? {};

    if (type && params) {
      injectControlsReferences(type, params, references);
      injectTimeSeriesReferences(type, params, references);
    }

    if (state.savedVis?.data.searchSource) {
      let extractedSearchSource = state.savedVis?.data
        .searchSource as SerializedSearchSourceFields & {
        indexRefName: string;
      };
      if (!('indexRefName' in state.savedVis.data.searchSource)) {
        // due to a bug in 8.0, some visualizations were saved with an injected state - re-extract in that case and inject the upstream references because they might have changed
        extractedSearchSource = extractSearchSourceReferences(
          extractedSearchSource
        )[0] as SerializedSearchSourceFields & {
          indexRefName: string;
        };
      }
      const injectedSearchSource = injectSearchSourceReferences(extractedSearchSource, references);
      state = {
        ...state,
        savedVis: {
          ...state.savedVis,
          data: {
            ...state.savedVis.data,
            searchSource: injectedSearchSource,
            savedSearchId: references.find((r) => r.name === 'search_0')?.id,
          },
        },
      };
    }

    return state as EmbeddableStateWithType;
  }

  public extract(_state: EmbeddableStateWithType) {
    let state = _state as unknown as VisualizeInput;
    const references = [];

    if (state.savedVis?.data.savedSearchId) {
      references.push({
        name: 'search_0',
        type: 'search',
        id: String(state.savedVis.data.savedSearchId),
      });
    }

    if (state.savedVis?.data.searchSource) {
      const [extractedSearchSource, searchSourceReferences] = extractSearchSourceReferences(
        state.savedVis.data.searchSource
      );

      references.push(...searchSourceReferences);
      state = {
        ...state,
        savedVis: {
          ...state.savedVis,
          data: {
            ...state.savedVis.data,
            searchSource: extractedSearchSource,
            savedSearchId: undefined,
          },
        },
      };
    }

    const { type, params } = state.savedVis ?? {};

    if (type && params) {
      extractControlsReferences(type, params, references, `control_${state.id}`);
      extractTimeSeriesReferences(type, params, references, `metrics_${state.id}`);
    }

    return { state: state as EmbeddableStateWithType, references };
  }
}
