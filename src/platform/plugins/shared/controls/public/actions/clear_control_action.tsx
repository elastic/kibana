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
import type {
  HasParentApi,
  HasType,
  PresentationContainer,
  EmbeddableApiContext,
  HasUniqueId,
} from '@kbn/presentation-publishing';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
} from '@kbn/presentation-publishing';
import type { FrequentCompatibilityChangeAction } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError, type Action } from '@kbn/ui-actions-plugin/public';

import type { CanClearSelections } from '../types';
import { isClearableControl } from '../types';
import { ACTION_CLEAR_CONTROL } from './constants';

type ClearControlActionApi = HasType &
  HasUniqueId &
  CanClearSelections &
  HasParentApi<PresentationContainer & HasType>;

const compatibilityCheck = (api: unknown | null): api is ClearControlActionApi =>
  Boolean(
    apiHasType(api) &&
      apiHasUniqueId(api) &&
      isClearableControl(api) &&
      api.hasSelections$.getValue() &&
      apiHasParentApi(api) &&
      apiCanAccessViewMode(api.parentApi)
  );

export class ClearControlAction
  implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext>
{
  public readonly type = ACTION_CLEAR_CONTROL;
  public readonly id = ACTION_CLEAR_CONTROL;
  public order = 60; // puts it before the edit action

  constructor() {}

  public getDisplayName() {
    return i18n.translate('controls.controlGroup.floatingActions.clearTitle', {
      defaultMessage: 'Clear control',
    });
  }

  public getIconType() {
    return 'eraser';
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isClearableControl(embeddable);
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    return isClearableControl(embeddable)
      ? embeddable.hasSelections$.pipe(map(() => undefined))
      : undefined;
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return compatibilityCheck(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
    embeddable.clearSelections();
  }
}
