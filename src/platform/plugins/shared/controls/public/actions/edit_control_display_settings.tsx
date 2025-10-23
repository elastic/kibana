/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
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

import type { EuiPopoverProps, EuiSwitchEvent } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFormRow,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
  EuiWrappingPopover,
} from '@elastic/eui';
import { apiHasPrependWrapperRef, type HasPrependWrapperRef } from '@kbn/controls-renderer';
import type { ControlWidth } from '@kbn/controls-schemas';
import { ACTION_EDIT_CONTROL_DISPLAY_SETTINGS } from './constants';
import { type PublishesControlsLayout, apiPublishesControlsLayout } from './types';

type PinnableControlApi = HasType &
  HasUniqueId &
  IsPinnable &
  HasParentApi<PinnableControlParentApi> &
  HasPrependWrapperRef;

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
      apiHasPrependWrapperRef(api) &&
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

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();

    // When the user changes a setting and the new layout is applied, the popover gets destroyed and re-rendered
    // Make sure it reopens if the user hasn't closed it
    const isPopoverOpenInitialState = useMemo(
      () => (apiCanLockHoverActions(embeddable) ? embeddable.hasLockedHoverActions$.value : false),
      [embeddable]
    );

    const [isPopoverOpen, setIsPopoverOpen] = useState(isPopoverOpenInitialState);

    const layoutState = embeddable.parentApi.layout$.value;
    const layoutEntry = useMemo(
      () => layoutState.controls[embeddable.uuid],
      [layoutState, embeddable.uuid]
    );
    const isToRightOfGrowControl = useMemo(
      () =>
        layoutEntry.order > 0 && Object.values(layoutState.controls)[layoutEntry.order - 1].grow,
      [layoutEntry.order, layoutState.controls]
    );

    const grow = useMemo(() => layoutEntry.grow ?? false, [layoutEntry]);
    const width = useMemo(() => layoutEntry.width ?? 'medium', [layoutEntry]);

    const applyNextLayout = useCallback(
      (nextGrow: boolean, nextWidth: ControlWidth) => {
        const currentLayout = embeddable.parentApi.layout$.getValue();
        embeddable.parentApi.layout$.next({
          ...currentLayout,
          controls: {
            ...currentLayout.controls,
            [embeddable.uuid]: {
              ...layoutEntry,
              grow: nextGrow,
              width: nextWidth,
            },
          },
        });
      },
      [embeddable.parentApi.layout$, embeddable.uuid, layoutEntry]
    );

    const onClose = useCallback(() => {
      if (apiCanLockHoverActions(embeddable)) {
        embeddable.lockHoverActions(false);
      }
      setIsPopoverOpen(false);
    }, [embeddable]);
    const onClickButton = useCallback(() => {
      if (isPopoverOpen) onClose();
      else if (apiCanLockHoverActions(embeddable)) {
        embeddable.lockHoverActions(true);
      }
      setIsPopoverOpen(true);
    }, [embeddable, isPopoverOpen, onClose]);

    const onWidthChange = useCallback(
      (id: string) => {
        applyNextLayout(grow, id as ControlWidth);
      },
      [applyNextLayout, grow]
    );
    const onGrowChange = useCallback(
      (e: EuiSwitchEvent) => {
        applyNextLayout(e.target.checked, width);
      },
      [applyNextLayout, width]
    );

    const settingsButton = (
      <EuiToolTip disableScreenReaderOutput content={this.getDisplayName()}>
        <EuiButtonIcon
          iconType={this.getIconType()}
          color="text"
          aria-label={this.getDisplayName()}
          onClick={onClickButton}
        />
      </EuiToolTip>
    );

    const popoverProps: Omit<EuiPopoverProps, 'button'> = {
      repositionOnScroll: true,
      panelPaddingSize: 'm',
      anchorPosition: isToRightOfGrowControl ? 'downRight' : 'downLeft',
      isOpen: isPopoverOpen,
      closePopover: onClose,
      focusTrapProps: {
        closeOnMouseup: true,
        clickOutsideDisables: false,
        onClickOutside: onClose,
      },
      panelStyle:
        /* Prevent popover from visually bouncing if it's being re-rendered already open */
        isPopoverOpenInitialState ? { transition: 'none' } : undefined,
    };

    const PopoverComponent: React.FC<React.PropsWithChildren> = ({ children }) =>
      isToRightOfGrowControl ? (
        <EuiPopover {...popoverProps} button={settingsButton} children={children} />
      ) : embeddable.prependWrapperRef.current ? (
        <EuiWrappingPopover
          {...popoverProps}
          button={embeddable.prependWrapperRef.current}
          children={children}
        />
      ) : null;

    return (
      <>
        {!isToRightOfGrowControl && settingsButton}
        <PopoverComponent>
          <EuiFormRow
            label={i18n.translate(
              'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.label',
              {
                defaultMessage: 'Minimum width',
              }
            )}
            fullWidth
          >
            <EuiButtonGroup
              legend={i18n.translate(
                'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.label',
                {
                  defaultMessage: 'Minimum width',
                }
              )}
              options={[
                {
                  id: `small`,
                  label: i18n.translate(
                    'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.small',
                    {
                      defaultMessage: 'Small',
                    }
                  ),
                },
                {
                  id: `medium`,
                  label: i18n.translate(
                    'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.medium',
                    {
                      defaultMessage: 'Medium',
                    }
                  ),
                },
                {
                  id: `large`,
                  label: i18n.translate(
                    'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.large',
                    {
                      defaultMessage: 'Large',
                    }
                  ),
                },
              ]}
              idSelected={width}
              onChange={onWidthChange}
              type="single"
              isFullWidth
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiSwitch
            compressed
            label={i18n.translate(
              'controls.controlGroup.floatingActions.editDisplaySettings.grow.label',
              {
                defaultMessage: 'Expand width to fit available space',
              }
            )}
            color="primary"
            checked={grow}
            onChange={(e) => onGrowChange(e)}
          />
        </PopoverComponent>
      </>
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

  public async execute() {
    // Intentionally left blank; all execution is handled in the MenuItem
  }
}
