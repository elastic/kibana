/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ViewMode,
  type PanelState,
  type IEmbeddable,
  isErrorEmbeddable,
  PanelNotFoundError,
  type EmbeddableInput,
  isReferenceOrValueEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { DashboardPanelState } from '../../common';
import { pluginServices } from '../services/plugin_services';
import { dashboardAddToLibraryActionStrings } from './_dashboard_actions_strings';
import { DASHBOARD_CONTAINER_TYPE, type DashboardContainer } from '../dashboard_container';

export const ACTION_ADD_TO_LIBRARY = 'saveToLibrary';

export interface AddToLibraryActionContext {
  embeddable: IEmbeddable;
}

export class AddToLibraryAction implements Action<AddToLibraryActionContext> {
  public readonly type = ACTION_ADD_TO_LIBRARY;
  public readonly id = ACTION_ADD_TO_LIBRARY;
  public order = 15;

  private applicationCapabilities;
  private toastsService;

  constructor() {
    ({
      application: { capabilities: this.applicationCapabilities },
      notifications: { toasts: this.toastsService },
    } = pluginServices.getServices());
  }

  public getDisplayName({ embeddable }: AddToLibraryActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return dashboardAddToLibraryActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: AddToLibraryActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return 'folderCheck';
  }

  public async isCompatible({ embeddable }: AddToLibraryActionContext) {
    // TODO: Fix this, potentially by adding a 'canSave' function to embeddable interface
    const { maps, visualize } = this.applicationCapabilities;
    const canSave = embeddable.type === 'map' ? maps.save : visualize.save;

    return Boolean(
      canSave &&
        !isErrorEmbeddable(embeddable) &&
        embeddable.getInput()?.viewMode !== ViewMode.VIEW &&
        embeddable.getRoot() &&
        embeddable.getRoot().isContainer &&
        embeddable.getRoot().type === DASHBOARD_CONTAINER_TYPE &&
        isReferenceOrValueEmbeddable(embeddable) &&
        !embeddable.inputIsRefType(embeddable.getInput())
    );
  }

  public async execute({ embeddable }: AddToLibraryActionContext) {
    if (!isReferenceOrValueEmbeddable(embeddable)) {
      throw new IncompatibleActionError();
    }
    const newInput = await embeddable.getInputAsRefType();

    embeddable.updateInput(newInput);

    const dashboard = embeddable.getRoot() as DashboardContainer;
    const panelToReplace = dashboard.getInput().panels[embeddable.id] as DashboardPanelState;
    if (!panelToReplace) {
      throw new PanelNotFoundError();
    }

    const newPanel: PanelState<EmbeddableInput> = {
      type: embeddable.type,
      explicitInput: { ...newInput },
    };
    dashboard.replacePanel(panelToReplace, newPanel, true);

    const title = dashboardAddToLibraryActionStrings.getSuccessMessage(
      embeddable.getTitle() ? `'${embeddable.getTitle()}'` : ''
    );
    this.toastsService.addSuccess({
      title,
      'data-test-subj': 'addPanelToLibrarySuccess',
    });
  }
}
