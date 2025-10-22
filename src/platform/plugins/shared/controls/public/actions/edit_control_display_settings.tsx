/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, combineLatest, map } from 'rxjs';

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
  apiHasParentApi,
  apiHasUniqueId,
  getInheritedViewMode,
  getViewModeSubject,
  type EmbeddableApiContext,
  type HasUniqueId,
} from '@kbn/presentation-publishing';
import type { FrequentCompatibilityChangeAction } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError, type Action } from '@kbn/ui-actions-plugin/public';

import {
  apiCanOpenDisplaySettingsPopover,
  type CanOpenDisplaySettingsPopover,
} from '@kbn/controls-renderer';
import { ACTION_EDIT_CONTROL_DISPLAY_SETTINGS } from './constants';
import { type PublishesControlsLayout, apiPublishesControlsLayout } from './types';

type PinnableControlApi = HasType &
  HasUniqueId &
  IsPinnable &
  HasParentApi<PinnableControlParentApi> &
  CanOpenDisplaySettingsPopover;

type PinnableControlParentApi = PresentationContainer &
  HasType &
  CanPinPanel &
  PublishesControlsLayout;

const parentCompatibilityCheck = (
  parentApi: unknown | null
): parentApi is PinnableControlParentApi =>
  Boolean(apiPublishesControlsLayout(parentApi) && apiCanPinPanel(parentApi));

const compatibilityCheck = (api: unknown | null): api is PinnableControlApi =>
  Boolean(
    apiHasUniqueId(api) &&
      apiCanBePinned(api) &&
      apiHasParentApi(api) &&
      parentCompatibilityCheck(api.parentApi) &&
      api.parentApi.panelIsPinned(api.uuid)
  );

export class EditControlDisplaySettingsAction
  implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext>
{
  public readonly type = ACTION_EDIT_CONTROL_DISPLAY_SETTINGS;
  public readonly id = ACTION_EDIT_CONTROL_DISPLAY_SETTINGS;
  public order = 1;

  constructor() {}

  public getDisplayName() {
    return i18n.translate('controls.controlGroup.floatingActions.editDisplaySettings', {
      defaultMessage: 'Settings',
    });
  }

  public getIconType() {
    return 'gear';
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return (
      apiHasParentApi(embeddable) &&
      apiCanPinPanel(embeddable.parentApi) &&
      apiCanOpenDisplaySettingsPopover(embeddable)
    );
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    return compatibilityCheck(embeddable)
      ? combineLatest([
          getViewModeSubject(embeddable) ?? new BehaviorSubject(undefined),
          embeddable.parentApi.layout$,
        ]).pipe(map(() => undefined))
      : undefined;
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return compatibilityCheck(embeddable) && getInheritedViewMode(embeddable) === 'edit';
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!apiCanOpenDisplaySettingsPopover(embeddable)) throw new IncompatibleActionError();
    embeddable.openDisplaySettingsPopover();
  }
}
