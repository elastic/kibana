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
import { dashboardUnlinkFromLibraryActionStrings } from './_dashboard_actions_strings';
import { type DashboardContainer, DASHBOARD_CONTAINER_TYPE } from '../dashboard_container';

export const ACTION_UNLINK_FROM_LIBRARY = 'unlinkFromLibrary';

export interface UnlinkFromLibraryActionContext {
  embeddable: IEmbeddable;
}

export class UnlinkFromLibraryAction implements Action<UnlinkFromLibraryActionContext> {
  public readonly type = ACTION_UNLINK_FROM_LIBRARY;
  public readonly id = ACTION_UNLINK_FROM_LIBRARY;
  public order = 15;

  private toastsService;

  constructor() {
    ({
      notifications: { toasts: this.toastsService },
    } = pluginServices.getServices());
  }

  public getDisplayName({ embeddable }: UnlinkFromLibraryActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return dashboardUnlinkFromLibraryActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: UnlinkFromLibraryActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return 'folderExclamation';
  }

  public async isCompatible({ embeddable }: UnlinkFromLibraryActionContext) {
    return Boolean(
      !isErrorEmbeddable(embeddable) &&
        embeddable.getInput()?.viewMode !== ViewMode.VIEW &&
        embeddable.getRoot() &&
        embeddable.getRoot().isContainer &&
        embeddable.getRoot().type === DASHBOARD_CONTAINER_TYPE &&
        isReferenceOrValueEmbeddable(embeddable) &&
        embeddable.inputIsRefType(embeddable.getInput())
    );
  }

  public async execute({ embeddable }: UnlinkFromLibraryActionContext) {
    if (!isReferenceOrValueEmbeddable(embeddable)) {
      throw new IncompatibleActionError();
    }

    const newInput = await embeddable.getInputAsValueType();
    embeddable.updateInput(newInput);

    const dashboard = embeddable.getRoot() as DashboardContainer;
    const panelToReplace = dashboard.getInput().panels[embeddable.id] as DashboardPanelState;

    if (!panelToReplace) {
      throw new PanelNotFoundError();
    }

    const newPanel: PanelState<EmbeddableInput> = {
      type: embeddable.type,
      explicitInput: { ...newInput, title: embeddable.getTitle() },
    };
    dashboard.replacePanel(panelToReplace, newPanel, true);

    const title = dashboardUnlinkFromLibraryActionStrings.getSuccessMessage(
      embeddable.getTitle() ? `'${embeddable.getTitle()}'` : ''
    );

    this.toastsService.addSuccess({
      title,
      'data-test-subj': 'unlinkPanelSuccess',
    });
  }
}
