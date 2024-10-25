/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  EmbeddableApiContext,
  HasParentApi,
  HasType,
  HasUniqueId,
  PublishesSavedObjectId,
  apiHasParentApi,
  apiHasUniqueId,
  apiIsOfType,
  apiPublishesSavedObjectId,
} from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { DashboardApi } from '../dashboard_api/types';
import { DASHBOARD_CONTAINER_TYPE } from '../dashboard_container';
import { coreServices } from '../services/kibana_services';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';
import { dashboardCopyToDashboardActionStrings } from './_dashboard_actions_strings';
import { DASHBOARD_ACTION_GROUP } from '.';
import { CopyToDashboardModal } from './copy_to_dashboard_modal';

export const ACTION_COPY_TO_DASHBOARD = 'copyToDashboard';

export interface DashboardCopyToCapabilities {
  canCreateNew: boolean;
  canEditExisting: boolean;
}

export type CopyToDashboardAPI = HasType &
  HasUniqueId &
  HasParentApi<
    { type: typeof DASHBOARD_CONTAINER_TYPE } & PublishesSavedObjectId &
      Pick<DashboardApi, 'getDashboardPanelFromId'>
  >;

const apiIsCompatible = (api: unknown): api is CopyToDashboardAPI => {
  return (
    apiHasUniqueId(api) &&
    apiHasParentApi(api) &&
    apiIsOfType(api.parentApi, DASHBOARD_CONTAINER_TYPE) &&
    (api?.parentApi as unknown as Pick<DashboardApi, 'getDashboardPanelFromId'>)
      ?.getDashboardPanelFromId !== undefined &&
    apiPublishesSavedObjectId(api.parentApi)
  );
};

export class CopyToDashboardAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_COPY_TO_DASHBOARD;
  public readonly id = ACTION_COPY_TO_DASHBOARD;
  public order = 1;
  public grouping = [DASHBOARD_ACTION_GROUP];

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!apiIsCompatible(embeddable)) throw new IncompatibleActionError();

    return dashboardCopyToDashboardActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!apiIsCompatible(embeddable)) throw new IncompatibleActionError();
    return 'exit';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!apiIsCompatible(embeddable)) return false;
    const { createNew: canCreateNew, showWriteControls: canEditExisting } =
      getDashboardCapabilities();
    return Boolean(canCreateNew || canEditExisting);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!apiIsCompatible(embeddable)) throw new IncompatibleActionError();

    const { theme, i18n } = coreServices;
    const session = coreServices.overlays.openModal(
      toMountPoint(<CopyToDashboardModal closeModal={() => session.close()} api={embeddable} />, {
        theme,
        i18n,
      }),
      {
        maxWidth: 400,
        'data-test-subj': 'copyToDashboardPanel',
      }
    );
  }
}
