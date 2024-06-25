/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { slice } from 'lodash';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiContextMenuItemIcon,
  EuiText,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiPopoverProps,
  EuiToolTip,
  useEuiTheme,
  useResizeObserver,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import type { FlyoutActionItem } from '../../customizations';

const MAX_VISIBLE_ACTIONS_BEFORE_THE_FOLD = 3;

export interface DiscoverGridFlyoutActionsProps {
  flyoutActions: FlyoutActionItem[];
}

export function DiscoverGridFlyoutActions({ flyoutActions }: DiscoverGridFlyoutActionsProps) {
  const { euiTheme } = useEuiTheme();
  const [ref, setRef] = useState<HTMLDivElement | HTMLSpanElement | null>(null);
  const dimensions = useResizeObserver(ref);
  const isMobileScreen = useIsWithinBreakpoints(['xs', 's']);
  const isLargeFlyout = dimensions?.width ? dimensions.width > euiTheme.base * 30 : false;
  return (
    <div ref={setRef}>
      <FlyoutActions
        flyoutActions={flyoutActions}
        isMobileScreen={isMobileScreen}
        isLargeFlyout={isLargeFlyout}
      />
    </div>
  );
}

function FlyoutActions({
  flyoutActions,
  isMobileScreen,
  isLargeFlyout,
}: {
  flyoutActions: DiscoverGridFlyoutActionsProps['flyoutActions'];
  isMobileScreen: boolean;
  isLargeFlyout: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const [isMoreFlyoutActionsPopoverOpen, setIsMoreFlyoutActionsPopoverOpen] =
    useState<boolean>(false);

  if (isMobileScreen) {
    return (
      <FlyoutActionsPopover
        flyoutActions={flyoutActions}
        button={
          <EuiButtonEmpty
            size="s"
            iconSize="s"
            iconType="arrowDown"
            iconSide="right"
            flush="left"
            data-test-subj="docViewerMobileActionsButton"
            onClick={() => setIsMoreFlyoutActionsPopoverOpen(!isMoreFlyoutActionsPopoverOpen)}
          >
            {i18n.translate('discover.grid.tableRow.mobileFlyoutActionsButton', {
              defaultMessage: 'Actions',
            })}
          </EuiButtonEmpty>
        }
        isOpen={isMoreFlyoutActionsPopoverOpen}
        closePopover={() => setIsMoreFlyoutActionsPopoverOpen(false)}
      />
    );
  }

  const visibleFlyoutActions = slice(flyoutActions, 0, MAX_VISIBLE_ACTIONS_BEFORE_THE_FOLD);
  const remainingFlyoutActions = slice(
    flyoutActions,
    MAX_VISIBLE_ACTIONS_BEFORE_THE_FOLD,
    flyoutActions.length
  );
  const showFlyoutIconsOnly =
    remainingFlyoutActions.length > 0 || (!isLargeFlyout && visibleFlyoutActions.length > 1);

  return (
    <EuiFlexGroup
      responsive={false}
      wrap={true}
      alignItems="center"
      gutterSize="none"
      data-test-subj="docViewerFlyoutActions"
      css={
        showFlyoutIconsOnly
          ? undefined
          : css`
              gap: ${(euiTheme.base / 4) * 3}px;
            `
      }
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          {i18n.translate('discover.grid.tableRow.actionsLabel', {
            defaultMessage: 'Actions',
          })}
          :
        </EuiText>
      </EuiFlexItem>
      {visibleFlyoutActions.map((action) => (
        <EuiFlexItem key={action.id} grow={false}>
          {showFlyoutIconsOnly ? (
            <EuiToolTip
              content={action.helpText ? `${action.label} - ${action.helpText}` : action.label}
            >
              <EuiButtonIcon
                size="s"
                iconType={action.iconType}
                data-test-subj={action.dataTestSubj}
                aria-label={action.label}
                href={action.href}
                onClick={action.onClick}
              />
            </EuiToolTip>
          ) : (
            <EuiToolTip content={action.helpText} delay="long">
              {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
              <EuiButtonEmpty
                size="s"
                iconSize="s"
                flush="both"
                iconType={action.iconType}
                data-test-subj={action.dataTestSubj}
                href={action.href}
                onClick={action.onClick}
              >
                {action.label}
              </EuiButtonEmpty>
            </EuiToolTip>
          )}
        </EuiFlexItem>
      ))}
      {remainingFlyoutActions.length > 0 && (
        <EuiFlexItem grow={false}>
          <FlyoutActionsPopover
            flyoutActions={remainingFlyoutActions}
            button={
              <EuiToolTip
                content={i18n.translate('discover.grid.tableRow.moreFlyoutActionsButton', {
                  defaultMessage: 'More actions',
                })}
              >
                <EuiButtonIcon
                  size="s"
                  iconType="boxesVertical"
                  data-test-subj="docViewerMoreFlyoutActionsButton"
                  aria-label={i18n.translate('discover.grid.tableRow.moreFlyoutActionsButton', {
                    defaultMessage: 'More actions',
                  })}
                  onClick={() => setIsMoreFlyoutActionsPopoverOpen(!isMoreFlyoutActionsPopoverOpen)}
                />
              </EuiToolTip>
            }
            isOpen={isMoreFlyoutActionsPopoverOpen}
            closePopover={() => setIsMoreFlyoutActionsPopoverOpen(false)}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

function FlyoutActionsPopover({
  flyoutActions,
  button,
  isOpen,
  closePopover,
}: {
  flyoutActions: DiscoverGridFlyoutActionsProps['flyoutActions'];
  button: EuiPopoverProps['button'];
  isOpen: EuiPopoverProps['isOpen'];
  closePopover: EuiPopoverProps['closePopover'];
}) {
  return (
    <EuiPopover
      id="docViewerMoreFlyoutActions"
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        size="s"
        items={flyoutActions.map((action) => (
          <EuiContextMenuItem
            key={action.id}
            icon={action.iconType as EuiContextMenuItemIcon}
            data-test-subj={action.dataTestSubj}
            href={action.href}
            onClick={action.onClick}
          >
            {action.label}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
}
