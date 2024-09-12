/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlyoutProps,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React, { memo, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { changePushVsOverlayAction, resetAllUserChangedWidthsAction } from '../store/actions';
import {
  SETTINGS_MENU_BUTTON_TEST_ID,
  SETTINGS_MENU_FLYOUT_RESIZE_BUTTON_TEST_ID,
  SETTINGS_MENU_FLYOUT_RESIZE_INFORMATION_ICON_TEST_ID,
  SETTINGS_MENU_FLYOUT_RESIZE_TITLE_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_OVERLAY_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_INFORMATION_ICON_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_TITLE_TEST_ID,
} from './test_ids';
import { selectPushVsOverlay, useDispatch, useSelector } from '../store/redux';

const SETTINGS_MENU_ICON_BUTTON = i18n.translate('expandableFlyout.settingsMenu.popoverButton', {
  defaultMessage: 'Open flyout settings menu',
});
const SETTINGS_MENU_ICON_BUTTON_TOOLTIP = i18n.translate(
  'expandableFlyout.settingsMenu.popoverButton',
  {
    defaultMessage: 'Flyout settings',
  }
);
const SETTINGS_MENU_TITLE = i18n.translate('expandableFlyout.settingsMenu.popoverTitle', {
  defaultMessage: 'Flyout settings',
});
const FLYOUT_TYPE_TITLE = i18n.translate('expandableFlyout.settingsMenu.flyoutTypeTitle', {
  defaultMessage: 'Flyout type',
});
const FLYOUT_TYPE_OVERLAY_MODE = i18n.translate('expandableFlyout.settingsMenu.overlayMode', {
  defaultMessage: 'Overlay',
});
const FLYOUT_TYPE_PUSH_MODE = i18n.translate('expandableFlyout.settingsMenu.pushMode', {
  defaultMessage: 'Push',
});
const FLYOUT_TYPE_OVERLAY_TOOLTIP = i18n.translate('expandableFlyout.settingsMenu.overlayTooltip', {
  defaultMessage: 'Displays the flyout over the page',
});
const FLYOUT_TYPE_PUSH_TOOLTIP = i18n.translate('expandableFlyout.settingsMenu.pushTooltip', {
  defaultMessage: 'Displays the flyout next to the page',
});
const FLYOUT_RESIZE_TITLE = i18n.translate('expandableFlyout.renderMenu.flyoutResizeTitle', {
  defaultMessage: 'Flyout size',
});
const FLYOUT_RESIZE_BUTTON = i18n.translate('expandableFlyout.renderMenu.flyoutResizeButton', {
  defaultMessage: 'Reset size',
});

export interface FlyoutCustomProps {
  /**
   * Hide the gear icon and settings menu if true
   */
  hideSettings?: boolean;
  /**
   * Control if the option to render in overlay or push mode is enabled or not
   */
  pushVsOverlay?: {
    /**
     * Disables the option
     */
    disabled: boolean;
    /**
     * Tooltip to display
     */
    tooltip: string;
  };
  /**
   * Control if the option to resize the flyout is enabled or not
   */
  resize?: {
    /**
     * Disables the option
     */
    disabled: boolean;
    /**
     * Tooltip to display
     */
    tooltip: string;
  };
}

export interface SettingsMenuProps {
  /**
   * Custom props to populate the content of the settings meny
   */
  flyoutCustomProps?: FlyoutCustomProps;
}

/**
 * Renders a menu to allow the user to customize the flyout.
 * Current customization are:
 * - Flyout type: overlay or push
 */
export const SettingsMenu: React.FC<SettingsMenuProps> = memo(
  ({ flyoutCustomProps }: SettingsMenuProps) => {
    const dispatch = useDispatch();

    // for flyout where the push vs overlay option is disable in the UI we fall back to overlay mode
    const type = useSelector(selectPushVsOverlay);
    const flyoutType = flyoutCustomProps?.pushVsOverlay?.disabled ? 'overlay' : type;

    const [isPopoverOpen, setPopover] = useState(false);
    const togglePopover = () => {
      setPopover(!isPopoverOpen);
    };

    const pushVsOverlayOnChange = useCallback(
      (id: string) => {
        dispatch(
          changePushVsOverlayAction({
            type: id as EuiFlyoutProps['type'] as 'overlay' | 'push',
            savedToLocalStorage: !flyoutCustomProps?.pushVsOverlay?.disabled,
          })
        );
        setPopover(false);
      },
      [dispatch, flyoutCustomProps?.pushVsOverlay?.disabled]
    );

    const resetSizeOnClick = useCallback(() => {
      dispatch(resetAllUserChangedWidthsAction());
      setPopover(false);
    }, [dispatch]);

    const panels = [
      {
        id: 0,
        title: SETTINGS_MENU_TITLE,
        content: (
          <EuiPanel paddingSize="s">
            <EuiTitle size="xxs" data-test-subj={SETTINGS_MENU_FLYOUT_TYPE_TITLE_TEST_ID}>
              <h3>
                {FLYOUT_TYPE_TITLE}{' '}
                {flyoutCustomProps?.pushVsOverlay?.tooltip && (
                  <EuiToolTip position="top" content={flyoutCustomProps?.pushVsOverlay?.tooltip}>
                    <EuiIcon
                      data-test-subj={SETTINGS_MENU_FLYOUT_TYPE_INFORMATION_ICON_TEST_ID}
                      type="iInCircle"
                      css={css`
                        margin-left: 4px;
                      `}
                    />
                  </EuiToolTip>
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiButtonGroup
              legend={FLYOUT_TYPE_TITLE}
              options={[
                {
                  id: 'overlay',
                  label: FLYOUT_TYPE_OVERLAY_MODE,
                  'data-test-subj': SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_OVERLAY_TEST_ID,
                  toolTipContent: FLYOUT_TYPE_OVERLAY_TOOLTIP,
                },
                {
                  id: 'push',
                  label: FLYOUT_TYPE_PUSH_MODE,
                  'data-test-subj': SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID,
                  toolTipContent: FLYOUT_TYPE_PUSH_TOOLTIP,
                },
              ]}
              idSelected={flyoutType}
              onChange={pushVsOverlayOnChange}
              isDisabled={flyoutCustomProps?.pushVsOverlay?.disabled}
              data-test-subj={SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID}
            />
            <EuiSpacer size="m" />
            <EuiTitle size="xxs" data-test-subj={SETTINGS_MENU_FLYOUT_RESIZE_TITLE_TEST_ID}>
              <h3>
                {FLYOUT_RESIZE_TITLE}{' '}
                {flyoutCustomProps?.resize?.tooltip && (
                  <EuiToolTip position="top" content={flyoutCustomProps?.resize?.tooltip}>
                    <EuiIcon
                      data-test-subj={SETTINGS_MENU_FLYOUT_RESIZE_INFORMATION_ICON_TEST_ID}
                      type="iInCircle"
                      css={css`
                        margin-left: 4px;
                      `}
                    />
                  </EuiToolTip>
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiButtonEmpty
              onClick={resetSizeOnClick}
              disabled={flyoutCustomProps?.resize?.disabled}
              data-test-subj={SETTINGS_MENU_FLYOUT_RESIZE_BUTTON_TEST_ID}
            >
              {FLYOUT_RESIZE_BUTTON}
            </EuiButtonEmpty>
          </EuiPanel>
        ),
      },
    ];

    const button = (
      <EuiToolTip content={SETTINGS_MENU_ICON_BUTTON_TOOLTIP}>
        <EuiButtonIcon
          aria-label={SETTINGS_MENU_ICON_BUTTON}
          iconType="gear"
          color="text"
          onClick={togglePopover}
          data-test-subj={SETTINGS_MENU_BUTTON_TEST_ID}
        />
      </EuiToolTip>
    );

    return (
      <div
        className={css`
          position: absolute;
          inset-inline-end: 36px;
          inset-block-start: 8px;
        `}
      >
        <EuiPopover
          button={button}
          isOpen={isPopoverOpen}
          closePopover={togglePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      </div>
    );
  }
);

SettingsMenu.displayName = 'SettingsMenu';
