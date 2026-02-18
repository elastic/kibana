/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { map } from 'rxjs';

import { i18n } from '@kbn/i18n';
import {
  apiCanPinPanels,
  apiHasParentApi,
  getInheritedViewMode,
  getViewModeSubject,
  type EmbeddableApiContext,
} from '@kbn/presentation-publishing';
import type { FrequentCompatibilityChangeAction } from '@kbn/ui-actions-plugin/public';
import { type Action } from '@kbn/ui-actions-plugin/public';

import { ACTION_EDIT_CONTROL_DISPLAY_SETTINGS } from '../constants';
import { apiIsPinnableControlApi } from './types';
import { ControlDisplaySettingsPopover } from './control_display_settings_popover';

export class EditControlDisplaySettingsAction
  implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext>
{
  public readonly type = ACTION_EDIT_CONTROL_DISPLAY_SETTINGS;
  public readonly id = ACTION_EDIT_CONTROL_DISPLAY_SETTINGS;
  public order = 1;

  constructor() {}

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    if (!apiIsPinnableControlApi(embeddable)) return null;

    return (
      <ControlDisplaySettingsPopover
        api={embeddable}
        displayName={this.getDisplayName()}
        iconType={this.getIconType()}
      />
    );
  };

  public getDisplayName() {
    return i18n.translate('controls.controlGroup.floatingActions.editDisplaySettings', {
      defaultMessage: 'Display settings',
    });
  }

  public getIconType() {
    return 'gear';
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return apiHasParentApi(embeddable) && apiCanPinPanels(embeddable.parentApi);
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    return apiIsPinnableControlApi(embeddable)
      ? getViewModeSubject(embeddable)?.pipe(map(() => undefined))
      : undefined;
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return apiIsPinnableControlApi(embeddable) && getInheritedViewMode(embeddable) === 'edit';
  }

  public async execute() {
    // Intentionally left blank; all execution is handled in the MenuItem
  }
}
