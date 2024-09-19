/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import {
  apiCanAccessViewMode,
  apiHasLegacyLibraryTransforms,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  getPanelTitle,
  PublishesPanelTitle,
  HasLegacyLibraryTransforms,
} from '@kbn/presentation-publishing';
import { dashboardUnlinkFromLibraryActionStrings } from './_dashboard_actions_strings';
import { coreServices } from '../services/kibana_services';

export const ACTION_LEGACY_UNLINK_FROM_LIBRARY = 'legacyUnlinkFromLibrary';

export type LegacyUnlinkPanelFromLibraryActionApi = CanAccessViewMode &
  HasLegacyLibraryTransforms &
  Partial<PublishesPanelTitle>;

export const legacyUnlinkActionIsCompatible = (
  api: unknown | null
): api is LegacyUnlinkPanelFromLibraryActionApi =>
  Boolean(apiCanAccessViewMode(api) && apiHasLegacyLibraryTransforms(api));

export class LegacyUnlinkFromLibraryAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_LEGACY_UNLINK_FROM_LIBRARY;
  public readonly id = ACTION_LEGACY_UNLINK_FROM_LIBRARY;
  public order = 15;

  constructor() {}

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!legacyUnlinkActionIsCompatible(embeddable)) throw new IncompatibleActionError();
    return dashboardUnlinkFromLibraryActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!legacyUnlinkActionIsCompatible(embeddable)) throw new IncompatibleActionError();
    return 'folderExclamation';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!legacyUnlinkActionIsCompatible(embeddable)) return false;
    return getInheritedViewMode(embeddable) === 'edit' && (await embeddable.canUnlinkFromLibrary());
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!legacyUnlinkActionIsCompatible(embeddable)) throw new IncompatibleActionError();
    const title = getPanelTitle(embeddable);
    try {
      await embeddable.unlinkFromLibrary();
      coreServices.notifications.toasts.addSuccess({
        title: dashboardUnlinkFromLibraryActionStrings.getSuccessMessage(title ? `'${title}'` : ''),
        'data-test-subj': 'unlinkPanelSuccess',
      });
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: dashboardUnlinkFromLibraryActionStrings.getFailureMessage(title ? `'${title}'` : ''),
        'data-test-subj': 'unlinkPanelFailure',
      });
    }
  }
}
