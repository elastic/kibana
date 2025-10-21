/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
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
  apiCanLockHoverActions,
  apiHasParentApi,
  apiHasUniqueId,
  getInheritedViewMode,
  getViewModeSubject,
  type EmbeddableApiContext,
  type HasUniqueId,
} from '@kbn/presentation-publishing';
import type { FrequentCompatibilityChangeAction } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError, type Action } from '@kbn/ui-actions-plugin/public';

import { EuiButtonIcon, EuiFlexGroup, EuiPopover, EuiToolTip } from '@elastic/eui';
import { ACTION_EDIT_CONTROL_DISPLAY_SETTINGS } from './constants';
import { type PublishesControlsLayout, apiPublishesControlsLayout } from './types';

type PinnableControlApi = HasType &
  HasUniqueId &
  IsPinnable &
  HasParentApi<PresentationContainer & HasType & CanPinPanel & PublishesControlsLayout>;

const compatibilityCheck = (api: unknown | null): api is PinnableControlApi =>
  Boolean(
    apiHasUniqueId(api) &&
      apiCanBePinned(api) &&
      apiHasParentApi(api) &&
      apiPublishesControlsLayout(api.parentApi) &&
      apiCanPinPanel(api.parentApi) &&
      api.parentApi.panelIsPinned(api.uuid)
  );

export class EditControlDisplaySettingsAction
  implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext>
{
  public readonly type = ACTION_EDIT_CONTROL_DISPLAY_SETTINGS;
  public readonly id = ACTION_EDIT_CONTROL_DISPLAY_SETTINGS;
  public order = 1;

  constructor() {}

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const onOpen = useCallback(() => {
      if (apiCanLockHoverActions(embeddable)) {
        embeddable.lockHoverActions(true);
      }
      setIsPopoverOpen(true);
    }, [embeddable]);
    const onClose = useCallback(() => {
      if (apiCanLockHoverActions(embeddable)) {
        embeddable.lockHoverActions(false);
      }
      setIsPopoverOpen(false);
    }, [embeddable]);
    return (
      <EuiPopover
        repositionOnScroll
        panelPaddingSize="s"
        anchorPosition="downRight"
        button={
          <EuiToolTip disableScreenReaderOutput content={this.getDisplayName()}>
            <EuiButtonIcon
              iconType={this.getIconType()}
              color="text"
              aria-label={this.getDisplayName()}
              onClick={onOpen}
            />
          </EuiToolTip>
        }
        isOpen={isPopoverOpen}
        closePopover={onClose}
        focusTrapProps={{
          closeOnMouseup: true,
          clickOutsideDisables: false,
          onClickOutside: onClose,
        }}
      >
        <EuiFlexGroup></EuiFlexGroup>
      </EuiPopover>
    );
  };

  public getDisplayName() {
    return i18n.translate('controls.controlGroup.floatingActions.editDisplaySettings', {
      defaultMessage: 'Settings',
    });
  }

  public getIconType() {
    return 'gear';
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return apiHasParentApi(embeddable) && apiCanPinPanel(embeddable.parentApi);
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
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
    // if (embeddable.parentApi.panelIsPinned(embeddable.uuid)) {
    //   embeddable.parentApi.unpinPanel(embeddable.uuid);
    // } else {
    //   embeddable.parentApi.pinPanel(embeddable.uuid);
    // }
  }
}
