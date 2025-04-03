/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent, ReactElement, createElement, HTMLAttributes } from 'react';
import { css } from '@emotion/css';

import {
  CommonProps,
  EuiButtonEmpty,
  EuiButtonEmptyProps,
  EuiContextMenuItem,
  EuiContextMenuItemProps,
  EuiLink,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

// @ts-expect-error
import { euiTitleStyles } from '@elastic/eui/es/components/title/title.styles';
import { NotificationEventMeta, NotificationEventMetaProps } from './notification_event_meta';
import {
  NotificationEventMessages,
  NotificationEventMessagesProps,
} from './notification_event_messages';
import {
  NotificationEventReadButton,
  NotificationEventReadButtonProps,
} from './notification_event_read_button';
import { NotificationEventReadIcon } from './notification_event_read_icon';

export type NotificationHeadingLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/**
 *
 */
export type NotificationEventProps = Omit<
  NotificationEventMetaProps,
  'onOpenContextMenu' | 'onRead' | 'eventName' | 'id'
> &
  Omit<NotificationEventReadButtonProps, 'onClick' | 'color' | 'eventName' | 'isRead' | 'id'> &
  CommonProps &
  Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
    /**
     * A unique identifier
     */
    id: string;
    /**
     * The title of the event.
     */
    title: string;
    /**
     * The heading level of the title.
     */
    headingLevel?: NotificationHeadingLevel;
    /**
     * Returns the `id` and applies an `onClick` handler to the title.
     */
    onClickTitle?: (id: string) => void;
    /**
     * The label of the primary action
     */
    primaryAction?: string;
    /**
     * Apply more props to the `primaryAction` button. See #EuiPrimaryActionProps.
     */
    primaryActionProps?: EuiButtonEmptyProps;
    /**
     * Returns the `id` and applies an `onClick` handler to the `primaryAction`.
     */
    onClickPrimaryAction?: (id: string) => void;
    /**
     * Notification messages as an array of strings. More than one message wraps in an accordion.
     */
    messages: NotificationEventMessagesProps['messages'];
    /**
     * Shows an indicator of the read state of the event. Leave as `undefined` to hide the indicator.
     */
    isRead?: boolean | undefined;
    /**
     * Returns the `id` and `isRead` state. Applies an `onClick` handler to the `read` indicator.
     */
    onRead?: (id: string, isRead: boolean) => void;
    /**
     * Provided the `id` of the event must return an array of #EuiContextMenuItem elements.
     */
    onOpenContextMenu?: (
      id: string
    ) => Array<ReactElement<EuiContextMenuItemProps, typeof EuiContextMenuItem>>;
  };

/**
 *
 */
export const NotificationEvent: FunctionComponent<NotificationEventProps> = ({
  id,
  type,
  severity,
  badgeColor,
  iconType,
  iconAriaLabel,
  time,
  title,
  isRead,
  primaryAction,
  primaryActionProps,
  messages,
  onRead,
  onOpenContextMenu,
  onClickTitle,
  onClickPrimaryAction,
  headingLevel = 'h2',
  className,
  ...rest
}) => {
  const randomHeadingId = useGeneratedHtmlId();
  const theme = useEuiTheme();
  const {
    euiTheme: { size, border, colors },
  } = theme;

  const rootClassname = css`
    display: flex;
    padding: ${size.m} 0 ${size.m} ${typeof isRead === 'boolean' ? size.s : size.m};
    border-bottom: ${border.thin};

    &:last-child {
      border-bottom: none;
    }
  `;

  const titleProps = {
    id: randomHeadingId,
    'data-test-subj': `${id}-notificationEventTitle`,
    className: css`
      ${euiTitleStyles(theme).xs};
      display: flex;
      color: ${isRead ? colors.darkShade : 'inherit'} !important;

      &.euiLink {
        color: ${colors.link};
      }
    `,
  };

  const readButtonClassname = css`
    margin-right: ${size.s};
  `;

  const contentClassname = css`
    flex: 1;

    > * + * {
      margin-top: ${size.s};
      margin-right: ${size.m};
    }
  `;

  return (
    <article aria-labelledby={randomHeadingId} className={rootClassname} key={id} {...rest}>
      {typeof isRead === 'boolean' && (
        <div className={readButtonClassname}>
          {!!onRead ? (
            <NotificationEventReadButton
              isRead={isRead}
              onClick={() => onRead(id, isRead)}
              eventName={title}
              id={id}
            />
          ) : (
            <NotificationEventReadIcon id={id} isRead={isRead} eventName={title} />
          )}
        </div>
      )}

      <div className={contentClassname}>
        <NotificationEventMeta
          id={id}
          type={type}
          severity={severity}
          badgeColor={badgeColor}
          iconType={iconType}
          iconAriaLabel={iconAriaLabel}
          time={time}
          onOpenContextMenu={onOpenContextMenu ? () => onOpenContextMenu(id) : undefined}
          eventName={title}
        />

        {onClickTitle ? (
          <EuiLink onClick={() => onClickTitle(id)} {...titleProps}>
            {createElement(headingLevel, null, title)}
          </EuiLink>
        ) : (
          createElement(headingLevel, titleProps, title)
        )}

        <NotificationEventMessages messages={messages} eventName={title} />

        {onClickPrimaryAction && primaryAction && (
          <div>
            <EuiButtonEmpty
              flush="left"
              size="s"
              {...primaryActionProps}
              onClick={() => onClickPrimaryAction?.(id)}
              data-test-subj={`${id}-notificationEventPrimaryAction`}
            >
              {primaryAction}
            </EuiButtonEmpty>
          </div>
        )}
      </div>
    </article>
  );
};
