/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutProps,
  EuiPanel,
  EuiPopover,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  RENDER_MENU_BUTTON_TEST_ID,
  RENDER_MENU_FLYOUT_TYPE_BUTTON_GROUP_OVERLAY_TEST_ID,
  RENDER_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID,
  RENDER_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID,
} from './test_ids';

const RENDER_MENU_ICON_BUTTON = i18n.translate('expandableFlyout.renderMenu.popoverButton', {
  defaultMessage: 'Open flyout render menu',
});
const FLYOUT_TYPE_TITLE = i18n.translate('expandableFlyout.renderMenu.flyoutTypeTitle', {
  defaultMessage: 'Flyout type',
});
const FLYOUT_TYPE_OVERLAY_MODE = i18n.translate('expandableFlyout.renderMenu.overlayMode', {
  defaultMessage: 'Overlay',
});
const FLYOUT_TYPE_PUSH_MODE = i18n.translate('expandableFlyout.renderMenu.pushMode', {
  defaultMessage: 'Push',
});
const FLYOUT_TYPE_RESET_BUTTON = i18n.translate('expandableFlyout.renderMenu.resetButton', {
  defaultMessage: 'Reset to default',
});

interface RenderMenuProps {
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
  };
}

/**
 * Renders a menu to allow the user to customize the flyout.
 * Current customization are:
 * - Flyout type: overlay or push
 */
export const RenderMenu: React.FC<RenderMenuProps> = ({ flyoutTypeProps }: RenderMenuProps) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const togglePopover = () => {
    setPopover(!isPopoverOpen);
  };

  const panels = [
    {
      id: 0,
      title: 'Flyout type',
      content: (
        <EuiPanel paddingSize="s">
          <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
            <EuiFlexItem>
              <EuiButtonGroup
                legend={FLYOUT_TYPE_TITLE}
                options={[
                  {
                    id: 'overlay',
                    label: FLYOUT_TYPE_OVERLAY_MODE,
                    'data-test-subj': RENDER_MENU_FLYOUT_TYPE_BUTTON_GROUP_OVERLAY_TEST_ID,
                  },
                  {
                    id: 'push',
                    label: FLYOUT_TYPE_PUSH_MODE,
                    'data-test-subj': RENDER_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID,
                  },
                ]}
                idSelected={flyoutTypeProps.type as string}
                onChange={(id: string) => flyoutTypeProps.onChange(id as EuiFlyoutProps['type'])}
                data-test-subj={RENDER_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              {flyoutTypeProps.type === 'push' && (
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => flyoutTypeProps.onChange('overlay')}
                  aria-label={FLYOUT_TYPE_RESET_BUTTON}
                >
                  {FLYOUT_TYPE_RESET_BUTTON}
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ),
    },
  ];

  const button = (
    <EuiButtonIcon
      aria-label={RENDER_MENU_ICON_BUTTON}
      iconType="gear"
      color="text"
      onClick={togglePopover}
      data-test-subj={RENDER_MENU_BUTTON_TEST_ID}
    />
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
};

RenderMenu.displayName = 'RenderMenu';
