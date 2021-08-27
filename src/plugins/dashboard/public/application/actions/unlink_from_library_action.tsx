/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { NotificationsStart } from '../../../../../core/public/notifications/notifications_service';
import type { EmbeddableInput, PanelState } from '../../../../embeddable/common/types';
import { ViewMode } from '../../../../embeddable/common/types';
import { isErrorEmbeddable } from '../../../../embeddable/public/lib/embeddables/error_embeddable';
import type { IEmbeddable } from '../../../../embeddable/public/lib/embeddables/i_embeddable';
import { PanelNotFoundError } from '../../../../embeddable/public/lib/errors';
import { isReferenceOrValueEmbeddable } from '../../../../embeddable/public/lib/reference_or_value_embeddable/types';
import type { Action } from '../../../../ui_actions/public/actions/action';
import { IncompatibleActionError } from '../../../../ui_actions/public/actions/incompatible_action_error';
import type { DashboardPanelState } from '../../../common/types';
import { dashboardUnlinkFromLibraryAction } from '../../dashboard_strings';
import { DASHBOARD_CONTAINER_TYPE } from '../embeddable/dashboard_constants';
import { DashboardContainer } from '../embeddable/dashboard_container';

export const ACTION_UNLINK_FROM_LIBRARY = 'unlinkFromLibrary';

export interface UnlinkFromLibraryActionContext {
  embeddable: IEmbeddable;
}

export class UnlinkFromLibraryAction implements Action<UnlinkFromLibraryActionContext> {
  public readonly type = ACTION_UNLINK_FROM_LIBRARY;
  public readonly id = ACTION_UNLINK_FROM_LIBRARY;
  public order = 15;

  constructor(private deps: { toasts: NotificationsStart['toasts'] }) {}

  public getDisplayName({ embeddable }: UnlinkFromLibraryActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return dashboardUnlinkFromLibraryAction.getDisplayName();
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
      explicitInput: { ...newInput },
    };
    dashboard.replacePanel(panelToReplace, newPanel, true);

    const title = dashboardUnlinkFromLibraryAction.getSuccessMessage(
      embeddable.getTitle() ? `'${embeddable.getTitle()}'` : ''
    );
    this.deps.toasts.addSuccess({
      title,
      'data-test-subj': 'unlinkPanelSuccess',
    });
  }
}
