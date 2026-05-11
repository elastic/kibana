/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionComponent, ReactNode, ReactElement } from 'react';
import React, { useState } from 'react';
import type {
  EuiBadgeProps,
  EuiContextMenuItem,
  EuiContextMenuItemProps,
  IconType,
} from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';

export interface NotificationEventMetaProps {
  id: string;
  /**
   * Type of event (e.g. "Alert", "Cloud", etc..). Shows inside a badge.
   */
  type: string;
  /**
   * A unique, human-friendly name for the event to be used in aria attributes (e.g. "alert-critical-01", "cloud-no-severity-12", etc..).
   */
  eventName: string;
  /**
   * Type of severity (e.g. "Critical", "Warning", etc..). Shows as a text after the `type` following the format "Alert: Critical".
   */
  severity?: string;
  /**
   * Accepts either our palette colors (primary, success ..etc) or a hex value `#FFFFFF`, `#000`.
   */
  badgeColor?: EuiBadgeProps['color'];
  /**
   * The icon used to visually represent this data type. Accepts any `EuiIcon IconType`.
   */
  iconType?: IconType;
  /**
   * Specify an `aria-label` for the icon.
   * If no `aria-label` is passed we assume the icon is purely decorative.
   */
  iconAriaLabel?: string;
  /**
   * Indicates when the event was received.
   */
  time: ReactNode;
  /**
   * Necessary to trigger `onOpenContextMenu` from #NotificationEvent
   */
  onOpenContextMenu?: () => Array<ReactElement<EuiContextMenuItemProps, typeof EuiContextMenuItem>>;
}

export const NotificationEventMeta: FunctionComponent<NotificationEventMetaProps> = ({
  id,
  iconType,
  type,
  time,
  badgeColor = 'hollow',
  severity,
  eventName,
  iconAriaLabel,
  onOpenContextMenu,
}) => {
  const theme = useEuiTheme();
  const {
    euiTheme: { size },
  } = theme;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [contextMenuItems, setContextMenuItems] = useState<
    ReturnType<NonNullable<typeof onOpenContextMenu>>
  >([]);

  const randomPopoverId = useGeneratedHtmlId();

  const contextMenuButtonLabel = i18n.translate('core.notifications.eventMeta.contextMenuButton', {
    defaultMessage: 'Menu for {eventName}',
    values: { eventName },
  });

  const ariaAttribute: { 'aria-label': string } | { 'aria-hidden': true } = iconAriaLabel
    ? { 'aria-label': iconAriaLabel }
    : { 'aria-hidden': true };

  const onOpenPopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
    if (onOpenContextMenu) {
      setContextMenuItems(onOpenContextMenu());
    }
  };

  const rootClassName = css`
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    margin-right: ${size.xs};
    min-height: ${size.l};

    ${onOpenContextMenu && `padding-right: ${size.l};`}
  `;

  const sectionClassName = css`
    margin-right: ${size.s};

    &:first-child {
      display: flex;
      flex: 1;
      align-items: center;
    }
  `;

  const iconClassName = css`
    margin-right: ${size.s};
  `;

  const badgeClassName = css`
    max-width: 100%;
    display: inline-grid;
  `;

  const contextMenuWrapperClassName = css`
    position: absolute;
    top: 0;
    right: 0;
  `;

  return (
    <div className={rootClassName}>
      <div className={sectionClassName}>
        {iconType && <EuiIcon className={iconClassName} type={iconType} {...ariaAttribute} />}

        {type && (
          <EuiBadge className={badgeClassName} color={badgeColor}>
            {severity ? `${type}: ${severity}` : type}
          </EuiBadge>
        )}
      </div>

      <div className={sectionClassName}>
        <EuiText size="xs" color="subdued">
          {time}
        </EuiText>
      </div>

      {onOpenContextMenu && (
        <div className={contextMenuWrapperClassName}>
          <EuiPopover
            id={randomPopoverId}
            aria-label={contextMenuButtonLabel}
            ownFocus
            repositionOnScroll
            isOpen={isPopoverOpen}
            panelPaddingSize="none"
            anchorPosition="leftUp"
            button={
              <EuiButtonIcon
                aria-label={contextMenuButtonLabel}
                aria-controls={randomPopoverId}
                aria-expanded={isPopoverOpen}
                aria-haspopup="true"
                iconType="boxesVertical"
                color="text"
                onClick={onOpenPopover}
                data-test-subj={`${id}-notificationEventMetaButton`}
              />
            }
            closePopover={() => setIsPopoverOpen(false)}
          >
            {/* The EuiContextMenu is wrapped with a div so it closes after an item is clicked */}
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
            <div onClick={() => setIsPopoverOpen(false)}>
              <EuiContextMenuPanel items={contextMenuItems} />
            </div>
          </EuiPopover>
        </div>
      )}
    </div>
  );
};
