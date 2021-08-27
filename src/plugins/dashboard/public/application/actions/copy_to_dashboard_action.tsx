/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { OverlayStart } from '../../../../../core/public/overlays/overlay_service';
import type { IEmbeddable } from '../../../../embeddable/public/lib/embeddables/i_embeddable';
import { EmbeddableStateTransfer } from '../../../../embeddable/public/lib/state_transfer/embeddable_state_transfer';
import { toMountPoint } from '../../../../kibana_react/public/util/to_mount_point';
import type { PresentationUtilPluginStart } from '../../../../presentation_util/public/types';
import type { Action } from '../../../../ui_actions/public/actions/action';
import { IncompatibleActionError } from '../../../../ui_actions/public/actions/incompatible_action_error';
import { dashboardCopyToDashboardAction } from '../../dashboard_strings';
import { DASHBOARD_CONTAINER_TYPE } from '../embeddable/dashboard_constants';
import { DashboardContainer } from '../embeddable/dashboard_container';
import { CopyToDashboardModal } from './copy_to_dashboard_modal';

export const ACTION_COPY_TO_DASHBOARD = 'copyToDashboard';

export interface CopyToDashboardActionContext {
  embeddable: IEmbeddable;
}

export interface DashboardCopyToCapabilities {
  canCreateNew: boolean;
  canEditExisting: boolean;
}

function isDashboard(embeddable: IEmbeddable): embeddable is DashboardContainer {
  return embeddable.type === DASHBOARD_CONTAINER_TYPE;
}

export class CopyToDashboardAction implements Action<CopyToDashboardActionContext> {
  public readonly type = ACTION_COPY_TO_DASHBOARD;
  public readonly id = ACTION_COPY_TO_DASHBOARD;
  public order = 1;

  constructor(
    private overlays: OverlayStart,
    private stateTransfer: EmbeddableStateTransfer,
    private capabilities: DashboardCopyToCapabilities,
    private PresentationUtilContext: PresentationUtilPluginStart['ContextProvider']
  ) {}

  public getDisplayName({ embeddable }: CopyToDashboardActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }

    return dashboardCopyToDashboardAction.getDisplayName();
  }

  public getIconType({ embeddable }: CopyToDashboardActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return 'exit';
  }

  public async isCompatible({ embeddable }: CopyToDashboardActionContext) {
    return Boolean(
      embeddable.parent &&
        isDashboard(embeddable.parent) &&
        (this.capabilities.canCreateNew || this.capabilities.canEditExisting)
    );
  }

  public async execute({ embeddable }: CopyToDashboardActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    const session = this.overlays.openModal(
      toMountPoint(
        <CopyToDashboardModal
          PresentationUtilContext={this.PresentationUtilContext}
          closeModal={() => session.close()}
          stateTransfer={this.stateTransfer}
          capabilities={this.capabilities}
          dashboardId={(embeddable.parent as DashboardContainer).getInput().id}
          embeddable={embeddable}
        />
      ),
      {
        maxWidth: 400,
        'data-test-subj': 'copyToDashboardPanel',
      }
    );
  }
}
