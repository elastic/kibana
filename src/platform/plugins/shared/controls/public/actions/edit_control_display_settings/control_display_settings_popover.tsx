/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSwitchEvent, EuiPopoverProps } from '@elastic/eui';
import {
  EuiToolTip,
  EuiButtonIcon,
  EuiPopover,
  EuiWrappingPopover,
  EuiFormRow,
  EuiButtonGroup,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';
import type { ControlWidth } from '@kbn/controls-schemas';
import { i18n } from '@kbn/i18n';
import {
  apiCanLockHoverActions,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import type { PinnableControlApi } from './types';
import { ACTION_EDIT_CONTROL_DISPLAY_SETTINGS } from '../constants';

interface Props {
  api: PinnableControlApi;
  displayName: string;
  iconType: string;
}

export const ControlDisplaySettingsPopover: React.FC<Props> = ({ api, displayName, iconType }) => {
  // When the user changes a setting and the new layout is applied, the popover gets destroyed and re-rendered
  // Make sure it reopens if the user hasn't closed it
  const isPopoverOpenInitialState = useMemo(
    () => (apiCanLockHoverActions(api) ? api.hasLockedHoverActions$.value : false),
    [api]
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(isPopoverOpenInitialState);

  const layoutState = useStateFromPublishingSubject(api.parentApi.layout$);
  const layoutEntry = useMemo(() => layoutState.controls[api.uuid], [layoutState, api.uuid]);
  const isToRightOfGrowControl = useMemo(
    () => layoutEntry.order > 0 && Object.values(layoutState.controls)[layoutEntry.order - 1].grow,
    [layoutEntry.order, layoutState.controls]
  );

  const grow = useMemo(() => layoutEntry.grow ?? DEFAULT_CONTROL_GROW, [layoutEntry]);
  const width = useMemo(() => layoutEntry.width ?? DEFAULT_CONTROL_WIDTH, [layoutEntry]);

  const applyNextLayout = useCallback(
    (nextGrow: boolean, nextWidth: ControlWidth) => {
      const currentLayout = api.parentApi.layout$.getValue();
      api.parentApi.layout$.next({
        ...currentLayout,
        controls: {
          ...currentLayout.controls,
          [api.uuid]: {
            ...layoutEntry,
            grow: nextGrow,
            width: nextWidth,
          },
        },
      });
    },
    [api.parentApi.layout$, api.uuid, layoutEntry]
  );

  const onClose = useCallback(() => {
    if (apiCanLockHoverActions(api)) {
      api.lockHoverActions(false);
    }
    setIsPopoverOpen(false);
  }, [api]);

  const onClickButton = useCallback(() => {
    if (isPopoverOpen) onClose();
    else if (apiCanLockHoverActions(api)) {
      api.lockHoverActions(true);
    }
    setIsPopoverOpen(true);
  }, [api, isPopoverOpen, onClose]);

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
    <EuiToolTip disableScreenReaderOutput content={displayName}>
      <EuiButtonIcon
        data-test-subj={`embeddablePanelAction-${ACTION_EDIT_CONTROL_DISPLAY_SETTINGS}`}
        iconType={iconType}
        color="text"
        aria-label={displayName}
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
    ) : api.prependWrapperRef.current ? (
      <EuiWrappingPopover
        {...popoverProps}
        button={api.prependWrapperRef.current}
        children={children}
      />
    ) : null;

  return (
    <>
      {!isToRightOfGrowControl && settingsButton}
      <PopoverComponent data-test-subj={`controlDisplaySettings-${api.uuid}`}>
        <EuiFormRow label={strings.minimumWidth} fullWidth>
          <EuiButtonGroup
            legend={strings.minimumWidth}
            options={widthOptions}
            idSelected={width}
            onChange={onWidthChange}
            type="single"
            isFullWidth
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiSwitch
          compressed
          label={strings.grow}
          color="primary"
          checked={grow}
          onChange={(e) => onGrowChange(e)}
        />
      </PopoverComponent>
    </>
  );
};

const strings = {
  minimumWidth: i18n.translate(
    'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.label',
    {
      defaultMessage: 'Minimum width',
    }
  ),
  grow: i18n.translate('controls.controlGroup.floatingActions.editDisplaySettings.grow.label', {
    defaultMessage: 'Expand width to fit available space',
  }),
};

const widthOptions = [
  {
    id: `small`,
    label: i18n.translate(
      'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.small',
      {
        defaultMessage: 'Small',
      }
    ),
    'data-test-subj': 'controlWidthOption-small',
  },
  {
    id: `medium`,
    label: i18n.translate(
      'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.medium',
      {
        defaultMessage: 'Medium',
      }
    ),
    'data-test-subj': 'controlWidthOption-medium',
  },
  {
    id: `large`,
    label: i18n.translate(
      'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.large',
      {
        defaultMessage: 'Large',
      }
    ),
    'data-test-subj': 'controlWidthOption-large',
  },
];
