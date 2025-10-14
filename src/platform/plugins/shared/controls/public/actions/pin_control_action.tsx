/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { map } from 'rxjs';

import { i18n } from '@kbn/i18n';
import {
  apiCanBePinned,
  apiCanPinPanel,
  type CanPinPanel,
  type IsPinnable,
  type PresentationContainer,
} from '@kbn/presentation-containers';
import type { HasParentApi, HasType } from '@kbn/presentation-publishing';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
  getInheritedViewMode,
  getViewModeSubject,
  type EmbeddableApiContext,
  type HasUniqueId,
} from '@kbn/presentation-publishing';
import type { FrequentCompatibilityChangeAction } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError, type Action } from '@kbn/ui-actions-plugin/public';

import { ACTION_PIN_CONTROL } from './constants';

type PinnableControlApi = HasType &
  HasUniqueId &
  IsPinnable &
  HasParentApi<PresentationContainer & HasType & CanPinPanel>;

const compatibilityCheck = (api: unknown | null): api is PinnableControlApi =>
  Boolean(
    apiHasType(api) &&
      apiHasUniqueId(api) &&
      apiCanBePinned(api) &&
      apiCanAccessViewMode(api) &&
      apiHasParentApi(api) &&
      apiCanPinPanel(api.parentApi)
  );

export class PinControlAction
  implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext>
{
  public readonly type = ACTION_PIN_CONTROL;
  public readonly id = ACTION_PIN_CONTROL;
  public order = 60; // puts it before the edit action

  constructor() {}

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
    return embeddable.parentApi.panelIsPinned(embeddable.uuid)
      ? i18n.translate('controls.controlGroup.floatingActions.unpinControl', {
          defaultMessage: 'Unpin',
        })
      : i18n.translate('controls.controlGroup.floatingActions.pinControl', {
          defaultMessage: 'Pin to Dashboard',
        });
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
    return embeddable.parentApi.panelIsPinned(embeddable.uuid) ? 'pinFilled' : 'pin';
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return apiHasParentApi(embeddable) && apiCanPinPanel(embeddable.parentApi);
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    return compatibilityCheck(embeddable)
      ? getViewModeSubject(embeddable)?.pipe(map(() => undefined))
      : undefined;
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return compatibilityCheck(embeddable) && getInheritedViewMode(embeddable) === 'edit';
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
    if (embeddable.parentApi.panelIsPinned(embeddable.uuid)) {
      embeddable.parentApi.unpinPanel(embeddable.uuid);
    } else {
      embeddable.parentApi.pinPanel(embeddable.uuid);
    }
  }
}
