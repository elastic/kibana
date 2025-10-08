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
  type EmbeddableApiContext,
  type HasUniqueId,
} from '@kbn/presentation-publishing';
import { IncompatibleActionError, type Action } from '@kbn/ui-actions-plugin/public';

import { ACTION_UNPIN_CONTROL } from './constants';

type PinnableControlApi = HasType &
  HasUniqueId &
  IsPinnable &
  HasParentApi<PresentationContainer & HasType & CanPinPanel>;

const compatibilityCheck = (api: unknown | null): api is PinnableControlApi =>
  Boolean(
    apiHasType(api) &&
      apiHasUniqueId(api) &&
      apiCanBePinned(api) &&
      apiHasParentApi(api) &&
      apiCanAccessViewMode(api.parentApi) &&
      apiCanPinPanel(api.parentApi)
  );

export class UnpinControlAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_UNPIN_CONTROL;
  public readonly id = ACTION_UNPIN_CONTROL;
  public order = 60; // puts it before the edit action

  constructor() {}

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
    return i18n.translate('controls.controlGroup.floatingActions.unpinControl', {
      defaultMessage: 'Unpin',
    });
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
    return 'pinFilled';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return compatibilityCheck(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
    embeddable.parentApi.unpinPanel(embeddable.uuid);
  }
}
