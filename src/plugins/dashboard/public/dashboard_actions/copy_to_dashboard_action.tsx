/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { toMountPoint } from '@kbn/react-kibana-mount';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { pluginServices } from '../services/plugin_services';
import { CopyToDashboardModal } from './copy_to_dashboard_modal';
import { dashboardCopyToDashboardActionStrings } from './_dashboard_actions_strings';
import { DashboardContainer, DASHBOARD_CONTAINER_TYPE } from '../dashboard_container';

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

  private dashboardCapabilities;
  private openModal;

  constructor(private core: CoreStart) {
    ({
      dashboardCapabilities: this.dashboardCapabilities,
      overlays: { openModal: this.openModal },
    } = pluginServices.getServices());
  }

  public getDisplayName({ embeddable }: CopyToDashboardActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }

    return dashboardCopyToDashboardActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: CopyToDashboardActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return 'exit';
  }

  public async isCompatible({ embeddable }: CopyToDashboardActionContext) {
    const { createNew: canCreateNew, showWriteControls: canEditExisting } =
      this.dashboardCapabilities;

    return Boolean(
      embeddable.parent && isDashboard(embeddable.parent) && (canCreateNew || canEditExisting)
    );
  }

  public async execute({ embeddable }: CopyToDashboardActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }

    const { theme, i18n } = this.core;
    const session = this.openModal(
      toMountPoint(
        <CopyToDashboardModal
          closeModal={() => session.close()}
          dashboardId={(embeddable.parent as DashboardContainer).getDashboardSavedObjectId()}
          embeddable={embeddable}
        />,
        { theme, i18n }
      ),
      {
        maxWidth: 400,
        'data-test-subj': 'copyToDashboardPanel',
      }
    );
  }
}
