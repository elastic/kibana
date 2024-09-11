/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
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
import {
  SETTINGS_MENU_BUTTON_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_OVERLAY_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_INFORMATION_ICON_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_TITLE_TEST_ID,
} from './test_ids';

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

interface SettingsMenuProps {
  /**
   * Current flyout type
   */
  flyoutTypeProps: {
    /**
     * 'push' or 'overlay'
     */
    type: EuiFlyoutProps['type'];
    /**
     * Callback to change the flyout type
     */
    onChange: (type: EuiFlyoutProps['type']) => void;
    /**
     * Disables the button group for flyout where the option shouldn't be available
     */
    disabled: boolean;
    /**
     * Allows to show a tooltip to explain why the option is disabled
     */
    tooltip: string;
  };
}

/**
 * Renders a menu to allow the user to customize the flyout.
 * Current customization are:
 * - Flyout type: overlay or push
 */
export const SettingsMenu: React.FC<SettingsMenuProps> = memo(
  ({ flyoutTypeProps }: SettingsMenuProps) => {
    const [isPopoverOpen, setPopover] = useState(false);
    const togglePopover = () => {
      setPopover(!isPopoverOpen);
    };

    const pushVsOverlayOnChange = useCallback(
      (id: string) => {
        flyoutTypeProps.onChange(id as EuiFlyoutProps['type']);
        setPopover(false);
      },
      [flyoutTypeProps]
    );

    const panels = [
      {
        id: 0,
        title: SETTINGS_MENU_TITLE,
        content: (
          <EuiPanel paddingSize="s">
            <EuiTitle size="xxs" data-test-subj={SETTINGS_MENU_FLYOUT_TYPE_TITLE_TEST_ID}>
              <h3>
                {FLYOUT_TYPE_TITLE}{' '}
                {flyoutTypeProps.tooltip && (
                  <EuiToolTip position="top" content={flyoutTypeProps.tooltip}>
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
              idSelected={flyoutTypeProps.type as string}
              onChange={pushVsOverlayOnChange}
              isDisabled={flyoutTypeProps.disabled}
              data-test-subj={SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID}
            />
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
