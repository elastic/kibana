/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { v4 as uuid } from 'uuid';

import { SavedObjectsStart } from '@kbn/core/public';
import {
  ViewMode,
  PanelState,
  IEmbeddable,
  PanelNotFoundError,
  EmbeddableInput,
  SavedObjectEmbeddableInput,
  isErrorEmbeddable,
  isReferenceOrValueEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { SavedObject } from '@kbn/saved-objects-plugin/public';

import {
  placePanelBeside,
  IPanelPlacementBesideArgs,
} from '../dashboard_container/component/panel/dashboard_panel_placement';
import { type DashboardPanelState } from '../../common';
import { pluginServices } from '../services/plugin_services';
import { dashboardClonePanelActionStrings } from './_dashboard_actions_strings';
import { DASHBOARD_CONTAINER_TYPE, type DashboardContainer } from '../dashboard_container';

export const ACTION_CLONE_PANEL = 'clonePanel';

export interface ClonePanelActionContext {
  embeddable: IEmbeddable;
}

export class ClonePanelAction implements Action<ClonePanelActionContext> {
  public readonly type = ACTION_CLONE_PANEL;
  public readonly id = ACTION_CLONE_PANEL;
  public order = 45;

  private toastsService;

  constructor(private savedObjects: SavedObjectsStart) {
    ({
      notifications: { toasts: this.toastsService },
    } = pluginServices.getServices());
  }

  public getDisplayName({ embeddable }: ClonePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return dashboardClonePanelActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: ClonePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return 'copy';
  }

  public async isCompatible({ embeddable }: ClonePanelActionContext) {
    return Boolean(
      !isErrorEmbeddable(embeddable) &&
        embeddable.getInput()?.viewMode !== ViewMode.VIEW &&
        embeddable.getRoot() &&
        embeddable.getRoot().isContainer &&
        embeddable.getRoot().type === DASHBOARD_CONTAINER_TYPE &&
        embeddable.getOutput().editable
    );
  }

  public async execute({ embeddable }: ClonePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }

    const dashboard = embeddable.getRoot() as DashboardContainer;
    const panelToClone = dashboard.getInput().panels[embeddable.id] as DashboardPanelState;
    if (!panelToClone) {
      throw new PanelNotFoundError();
    }

    dashboard.showPlaceholderUntil(
      this.cloneEmbeddable(panelToClone, embeddable),
      placePanelBeside,
      {
        width: panelToClone.gridData.w,
        height: panelToClone.gridData.h,
        currentPanels: dashboard.getInput().panels,
        placeBesideId: panelToClone.explicitInput.id,
      } as IPanelPlacementBesideArgs
    );
  }

  private async getCloneTitle(embeddable: IEmbeddable, rawTitle: string) {
    if (rawTitle === '') return ''; // If

    const clonedTag = dashboardClonePanelActionStrings.getClonedTag();
    const cloneRegex = new RegExp(`\\(${clonedTag}\\)`, 'g');
    const cloneNumberRegex = new RegExp(`\\(${clonedTag} [0-9]+\\)`, 'g');
    const baseTitle = rawTitle.replace(cloneNumberRegex, '').replace(cloneRegex, '').trim();
    let similarTitles: string[];
    if (
      isReferenceOrValueEmbeddable(embeddable) ||
      !_.has(embeddable.getExplicitInput(), 'savedObjectId')
    ) {
      const dashboard: DashboardContainer = embeddable.getRoot() as DashboardContainer;
      similarTitles = _.filter(await dashboard.getPanelTitles(), (title: string) => {
        return title.startsWith(baseTitle);
      });
    } else {
      const perPage = 10;
      const similarSavedObjects = await this.savedObjects.client.find<SavedObject>({
        type: embeddable.type,
        perPage,
        fields: ['title'],
        searchFields: ['title'],
        search: `"${baseTitle}"`,
      });
      if (similarSavedObjects.total <= perPage) {
        similarTitles = similarSavedObjects.savedObjects.map((savedObject) => {
          return savedObject.get('title');
        });
      } else {
        similarTitles = [baseTitle + ` (${clonedTag} ${similarSavedObjects.total - 1})`];
      }
    }

    const cloneNumbers = _.map(similarTitles, (title: string) => {
      if (title.match(cloneRegex)) return 0;
      const cloneTag = title.match(cloneNumberRegex);
      return cloneTag ? parseInt(cloneTag[0].replace(/[^0-9.]/g, ''), 10) : -1;
    });
    const similarBaseTitlesCount = _.max(cloneNumbers) || 0;

    return similarBaseTitlesCount < 0
      ? baseTitle + ` (${clonedTag})`
      : baseTitle + ` (${clonedTag} ${similarBaseTitlesCount + 1})`;
  }

  private async addCloneToLibrary(
    embeddable: IEmbeddable,
    objectIdToClone: string
  ): Promise<string> {
    const savedObjectToClone = await this.savedObjects.client.get<SavedObject>(
      embeddable.type,
      objectIdToClone
    );

    // Clone the saved object
    const newTitle = await this.getCloneTitle(embeddable, savedObjectToClone.attributes.title);
    const clonedSavedObject = await this.savedObjects.client.create(
      embeddable.type,
      {
        ..._.cloneDeep(savedObjectToClone.attributes),
        title: newTitle,
      },
      { references: _.cloneDeep(savedObjectToClone.references) }
    );
    return clonedSavedObject.id;
  }

  private async cloneEmbeddable(
    panelToClone: DashboardPanelState,
    embeddable: IEmbeddable
  ): Promise<Partial<PanelState>> {
    let panelState: PanelState<EmbeddableInput>;
    if (isReferenceOrValueEmbeddable(embeddable)) {
      const newTitle = await this.getCloneTitle(embeddable, embeddable.getTitle() || '');
      panelState = {
        type: embeddable.type,
        explicitInput: {
          ...(await embeddable.getInputAsValueType()),
          id: uuid(),
          title: newTitle,
          hidePanelTitles: panelToClone.explicitInput.hidePanelTitles,
        },
      };
    } else {
      panelState = {
        type: embeddable.type,
        explicitInput: {
          ...panelToClone.explicitInput,
          id: uuid(),
        },
      };
      if (panelToClone.explicitInput.savedObjectId) {
        const clonedSavedObjectId = await this.addCloneToLibrary(
          embeddable,
          panelToClone.explicitInput.savedObjectId
        );
        (panelState.explicitInput as SavedObjectEmbeddableInput).savedObjectId =
          clonedSavedObjectId;
      }
    }
    this.toastsService.addSuccess({
      title: dashboardClonePanelActionStrings.getSuccessMessage(),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
    return panelState;
  }
}
