/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

import { Action, IncompatibleActionError } from '../../services/ui_actions';
import {
  ViewMode,
  PanelState,
  IEmbeddable,
  PanelNotFoundError,
  EmbeddableInput,
  isReferenceOrValueEmbeddable,
  isErrorEmbeddable,
} from '../../services/embeddable';
import { NotificationsStart } from '../../services/core';
import { dashboardAddToLibraryAction } from '../../dashboard_strings';
import { DashboardPanelState, DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '..';

export const ACTION_ADD_TO_LIBRARY = 'addToFromLibrary';

export interface AddToLibraryActionContext {
  embeddable: IEmbeddable;
}

export class AddToLibraryAction implements Action<AddToLibraryActionContext> {
  public readonly type = ACTION_ADD_TO_LIBRARY;
  public readonly id = ACTION_ADD_TO_LIBRARY;
  public order = 15;

  constructor(private deps: { toasts: NotificationsStart['toasts'] }) {}

  public getDisplayName({ embeddable }: AddToLibraryActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return dashboardAddToLibraryAction.getDisplayName();
  }

  public getIconType({ embeddable }: AddToLibraryActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return 'folderCheck';
  }

  public async isCompatible({ embeddable }: AddToLibraryActionContext) {
    return Boolean(
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

    const title = dashboardAddToLibraryAction.getSuccessMessage(
      embeddable.getTitle() ? `'${embeddable.getTitle()}'` : ''
    );
    this.deps.toasts.addSuccess({
      title,
      'data-test-subj': 'addPanelToLibrarySuccess',
    });
  }
}
