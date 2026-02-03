/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverFooter,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';
import type { ControlWidth } from '@kbn/controls-schemas';
import { i18n } from '@kbn/i18n';
import { apiCanLockHoverActions } from '@kbn/presentation-publishing';
import React, { useCallback, useMemo, useState } from 'react';
import { ACTION_EDIT_CONTROL_DISPLAY_SETTINGS } from '../constants';
import type { PinnableControlApi } from './types';

interface Props {
  api: PinnableControlApi;
  displayName: string;
  iconType: string;
}

export const ControlDisplaySettingsPopover: React.FC<Props> = ({ api, displayName, iconType }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const initialState = useMemo(
    () => {
      return {
        width: DEFAULT_CONTROL_WIDTH,
        grow: DEFAULT_CONTROL_GROW,
        ...api.parentApi.getLayout(api.uuid),
      };
    },
    // We should re-calculate `initialState` when the popover opens/closes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, isPopoverOpen]
  );

  const [width, setWidth] = useState<ControlWidth>(initialState.width as ControlWidth);
  const [grow, setGrow] = useState<boolean>(initialState.grow);

  const onClose = useCallback(() => {
    setIsPopoverOpen(false);
    if (apiCanLockHoverActions(api)) {
      api.lockHoverActions(false);
    }
  }, [api]);

  const onClickButton = useCallback(() => {
    if (isPopoverOpen) {
      onClose();
      return;
    }
    setIsPopoverOpen(true);
    if (apiCanLockHoverActions(api)) {
      api.lockHoverActions(true);
    }
  }, [api, isPopoverOpen, onClose]);

  return (
    <EuiPopover
      button={
        <EuiToolTip disableScreenReaderOutput content={displayName}>
          <EuiButtonIcon
            data-test-subj={`embeddablePanelAction-${ACTION_EDIT_CONTROL_DISPLAY_SETTINGS}`}
            iconType={iconType}
            color="text"
            aria-label={displayName}
            onClick={onClickButton}
          />
        </EuiToolTip>
      }
      repositionOnScroll
      panelPaddingSize="m"
      isOpen={isPopoverOpen}
      closePopover={onClose}
      focusTrapProps={{
        closeOnMouseup: true,
        clickOutsideDisables: false,
        onClickOutside: onClose,
      }}
      data-test-subj={`controlDisplaySettings-${api.uuid}`}
    >
      <EuiFormRow label={strings.minimumWidth} fullWidth>
        <EuiButtonGroup
          legend={strings.minimumWidth}
          options={widthOptions}
          idSelected={width}
          onChange={(newWidth) => setWidth(newWidth as ControlWidth)}
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
        onChange={(e) => setGrow(Boolean(e.target.checked))}
      />
      <EuiPopoverFooter paddingSize="s">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiButtonEmpty
              size="s"
              onClick={() => {
                onClose();
                setWidth(initialState.width as ControlWidth);
                setGrow(initialState.grow);
              }}
            >
              {i18n.translate('controls.displaySettingsPopover.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              size="s"
              fill
              disabled={grow === initialState.grow && width === initialState.width}
              onClick={() => {
                onClose();
                api.parentApi.setLayout(api.uuid, { ...initialState, grow, width });
              }}
            >
              {i18n.translate('controls.displaySettingsPopover.applyButton', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
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
