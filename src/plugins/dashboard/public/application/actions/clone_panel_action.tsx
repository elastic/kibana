/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import uuid from 'uuid';

import { CoreStart } from 'src/core/public';
import { Action, IncompatibleActionError } from '../../services/ui_actions';
import { SavedObject } from '../../services/saved_objects';
import {
  ViewMode,
  PanelState,
  IEmbeddable,
  PanelNotFoundError,
  EmbeddableInput,
  SavedObjectEmbeddableInput,
  isErrorEmbeddable,
} from '../../services/embeddable';
import {
  placePanelBeside,
  IPanelPlacementBesideArgs,
} from '../embeddable/panel/dashboard_panel_placement';
import { dashboardClonePanelAction } from '../../dashboard_strings';
import { DashboardPanelState, DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '..';

export const ACTION_CLONE_PANEL = 'clonePanel';

export interface ClonePanelActionContext {
  embeddable: IEmbeddable;
}

export class ClonePanelAction implements Action<ClonePanelActionContext> {
  public readonly type = ACTION_CLONE_PANEL;
  public readonly id = ACTION_CLONE_PANEL;
  public order = 45;

  constructor(private core: CoreStart) {}

  public getDisplayName({ embeddable }: ClonePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return dashboardClonePanelAction.getDisplayName();
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
      this.cloneEmbeddable(panelToClone, embeddable.type),
      placePanelBeside,
      {
        width: panelToClone.gridData.w,
        height: panelToClone.gridData.h,
        currentPanels: dashboard.getInput().panels,
        placeBesideId: panelToClone.explicitInput.id,
      } as IPanelPlacementBesideArgs
    );
  }

  private async getUniqueTitle(rawTitle: string, embeddableType: string): Promise<string> {
    const clonedTag = dashboardClonePanelAction.getClonedTag();
    const cloneRegex = new RegExp(`\\(${clonedTag}\\)`, 'g');
    const cloneNumberRegex = new RegExp(`\\(${clonedTag} [0-9]+\\)`, 'g');
    const baseTitle = rawTitle.replace(cloneNumberRegex, '').replace(cloneRegex, '').trim();

    const similarSavedObjects = await this.core.savedObjects.client.find<SavedObject>({
      type: embeddableType,
      perPage: 0,
      fields: ['title'],
      searchFields: ['title'],
      search: `"${baseTitle}"`,
    });
    const similarBaseTitlesCount: number = similarSavedObjects.total - 1;

    return similarBaseTitlesCount <= 0
      ? baseTitle + ` (${clonedTag})`
      : baseTitle + ` (${clonedTag} ${similarBaseTitlesCount})`;
  }

  private async cloneEmbeddable(
    panelToClone: DashboardPanelState,
    embeddableType: string
  ): Promise<Partial<PanelState>> {
    const panelState: PanelState<EmbeddableInput> = {
      type: embeddableType,
      explicitInput: {
        ...panelToClone.explicitInput,
        id: uuid.v4(),
      },
    };
    let newTitle: string = '';
    if (panelToClone.explicitInput.savedObjectId) {
      // Fetch existing saved object
      const savedObjectToClone = await this.core.savedObjects.client.get<SavedObject>(
        embeddableType,
        panelToClone.explicitInput.savedObjectId
      );

      // Clone the saved object
      newTitle = await this.getUniqueTitle(savedObjectToClone.attributes.title, embeddableType);
      const clonedSavedObject = await this.core.savedObjects.client.create(
        embeddableType,
        {
          ..._.cloneDeep(savedObjectToClone.attributes),
          title: newTitle,
        },
        { references: _.cloneDeep(savedObjectToClone.references) }
      );
      (panelState.explicitInput as SavedObjectEmbeddableInput).savedObjectId = clonedSavedObject.id;
    }
    this.core.notifications.toasts.addSuccess({
      title: dashboardClonePanelAction.getSuccessMessage(),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
    return panelState;
  }
}
