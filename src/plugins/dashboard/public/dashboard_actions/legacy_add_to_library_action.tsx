/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  apiCanAccessViewMode,
  apiHasLegacyLibraryTransforms,
  EmbeddableApiContext,
  getPanelTitle,
  PublishesPanelTitle,
  CanAccessViewMode,
  getInheritedViewMode,
  HasLegacyLibraryTransforms,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { dashboardAddToLibraryActionStrings } from './_dashboard_actions_strings';
import { coreServices } from '../services/kibana_services';

export const ACTION_LEGACY_ADD_TO_LIBRARY = 'legacySaveToLibrary';

export type LegacyAddPanelToLibraryActionApi = CanAccessViewMode &
  HasLegacyLibraryTransforms &
  Partial<PublishesPanelTitle>;

const isApiCompatible = (api: unknown | null): api is LegacyAddPanelToLibraryActionApi =>
  Boolean(apiCanAccessViewMode(api) && apiHasLegacyLibraryTransforms(api));

export class LegacyAddToLibraryAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_LEGACY_ADD_TO_LIBRARY;
  public readonly id = ACTION_LEGACY_ADD_TO_LIBRARY;
  public order = 15;

  constructor() {}

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return dashboardAddToLibraryActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return 'folderCheck';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) return false;
    return getInheritedViewMode(embeddable) === 'edit' && (await embeddable.canLinkToLibrary());
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    const panelTitle = getPanelTitle(embeddable);
    try {
      await embeddable.linkToLibrary();
      coreServices.notifications.toasts.addSuccess({
        title: dashboardAddToLibraryActionStrings.getSuccessMessage(
          panelTitle ? `'${panelTitle}'` : ''
        ),
        'data-test-subj': 'addPanelToLibrarySuccess',
      });
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: dashboardAddToLibraryActionStrings.getErrorMessage(panelTitle),
        'data-test-subj': 'addPanelToLibraryError',
      });
    }
  }
}
