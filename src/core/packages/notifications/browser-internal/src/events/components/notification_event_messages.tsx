/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiAccordion, EuiText, useEuiI18n, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/css';
import React, { FunctionComponent, useState } from 'react';

export interface NotificationEventMessagesProps {
  /*
   * An array of strings that get individually wrapped in `<p>` tags
   */
  messages: string[];
  /**
   * A unique, human-friendly name for the event to be used in aria attributes (e.g. "alert-critical-01", "cloud-no-severity-12", etc..).
   */
  eventName: string;
}

export const NotificationEventMessages: FunctionComponent<NotificationEventMessagesProps> = ({
  messages,
  eventName,
}) => {
  const theme = useEuiTheme();
  const {
    euiTheme: { size, colors },
  } = theme;

  const [isOpen, setIsOpen] = useState(false);
  const messagesLength = messages.length;

  const accordionId = useGeneratedHtmlId({
    prefix: 'euiNotificationEventMessagesAccordion',
  });

  const accordionButtonText = useEuiI18n(
    'euiNotificationEventMessages.accordionButtonText',
    '+ {messagesLength} more',
    { messagesLength: messagesLength - 1 }
  );

  const accordionAriaLabelButtonText = useEuiI18n(
    'euiNotificationEventMessages.accordionAriaLabelButtonText',
    '+ {messagesLength} messages for {eventName}',
    {
      messagesLength: messagesLength - 1,
      eventName,
    }
  );

  const accordionHideText = useEuiI18n('euiNotificationEventMessages.accordionHideText', 'hide');

  const buttonContentText = isOpen
    ? `${accordionButtonText} (${accordionHideText})`
    : accordionButtonText;

  const rootClassName = css`
    font-size: ${size.s};
  `;

  const accordionClassName = css`
    color: ${colors.darkShade};
  `;
  const accordionButtonClassName = css`
    color: ${colors.link};
  `;
  const accordionContentClassName = css`
    > * {
      padding-top: ${size.s};
    }
  `;

  return (
    <div className={rootClassName}>
      {messages && messagesLength === 1 ? (
        <EuiText size="s" color="subdued">
          <p>{messages}</p>
        </EuiText>
      ) : (
        <>
          <EuiText size="s" color="subdued">
            <p>{messages[0]}</p>
          </EuiText>

          <EuiAccordion
            onToggle={setIsOpen}
            buttonProps={{ 'aria-label': accordionAriaLabelButtonText }}
            id={accordionId}
            className={accordionClassName}
            buttonContent={buttonContentText}
            buttonClassName={accordionButtonClassName}
            arrowDisplay="none"
          >
            <div className={accordionContentClassName}>
              {messages
                .map((notification, index) => (
                  <EuiText size="s" key={index} color="subdued">
                    <p>{notification}</p>
                  </EuiText>
                ))
                .slice(1)}
            </div>
          </EuiAccordion>
        </>
      )}
    </div>
  );
};
