/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import {
  EmbeddableApiContext,
  CanAccessViewMode,
  apiCanAccessViewMode,
  getInheritedViewMode,
  getViewModeSubject,
  HasReadOnlyCapabilities,
  hasReadOnlyCapabilities,
} from '@kbn/presentation-publishing';
import {
  Action,
  FrequentCompatibilityChangeAction,
  IncompatibleActionError,
} from '@kbn/ui-actions-plugin/public';
import { map } from 'rxjs';
import { ACTION_SHOW_CONFIG_PANEL } from './constants';

export type ShowConfigPanelActionApi = CanAccessViewMode & HasReadOnlyCapabilities;

const isApiCompatible = (api: unknown | null): api is ShowConfigPanelActionApi => {
  return hasReadOnlyCapabilities(api) && apiCanAccessViewMode(api);
};

export class ShowConfigPanelAction
  implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext>
{
  public readonly type = ACTION_SHOW_CONFIG_PANEL;
  public readonly id = ACTION_SHOW_CONFIG_PANEL;
  public order = 50;

  constructor() {}

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return i18n.translate('presentationPanel.action.showConfigPanel.displayName', {
      defaultMessage: 'Show {value} configuration',
      values: {
        value: embeddable.getTypeDisplayName(),
      },
    });
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    return apiCanAccessViewMode(embeddable)
      ? getViewModeSubject(embeddable)?.pipe(map(() => undefined))
      : undefined;
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return 'glasses';
  }

  /**
   * The compatible check is scoped to the read only capabilities
   * Note: it does not take into account write permissions
   */
  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable) || getInheritedViewMode(embeddable) !== 'view') {
      return false;
    }
    const { read: canRead, write: canWrite } = embeddable.isReadOnlyEnabled();
    return Boolean(
      // No option to view or edit the configuration is offered for users with write permission.
      canRead && !canWrite
    );
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    await embeddable.onShowConfig();
  }
}
