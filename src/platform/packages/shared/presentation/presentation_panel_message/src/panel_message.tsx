/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiIcon, EuiLink } from '@elastic/eui';
import type { IconColor, IconType } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export type PanelMessageSeverity = 'error' | 'warning' | 'info';

export interface PanelMessageAction {
  readonly label: string;
  /**
   * Receives the click event. When `href` is also set, prevent the default so the browser does
   * not reload the page, for example by passing the output of `getRouterLinkProps`.
   */
  readonly onClick: (event: MouseEvent<HTMLElement>) => void;
  /** Set when the action navigates, so it can be opened in a new tab. */
  readonly href?: string;
  readonly 'data-test-subj'?: string;
}

export interface PanelMessageProps {
  readonly severity: PanelMessageSeverity;
  /** What happened, in plain words. Sentence case, no end period. */
  readonly title: string;
  /** What to do next, as inline content. Two short sentences at most. */
  readonly body: ReactNode;
  /** Replaces the default icon for the severity. Give it an accessible name if it carries meaning. */
  readonly icon?: ReactNode;
  /** The action that starts the fix. Omit it when the user lacks permission for it. */
  readonly primaryAction?: PanelMessageAction;
  /** Rendered as links at the end of the body. */
  readonly secondaryActions?: readonly PanelMessageAction[];
  /** Adds a "View details" link to the end of the body, used to reveal the raw Elasticsearch error. */
  readonly onViewDetails?: () => void;
  readonly 'data-test-subj'?: string;
}

const SEVERITY_ICONS: Readonly<
  Record<
    PanelMessageSeverity,
    { readonly type: IconType; readonly color: IconColor; readonly label: string }
  >
> = {
  error: {
    type: 'error',
    color: 'danger',
    label: i18n.translate('presentationPanelMessage.errorIconAriaLabel', {
      defaultMessage: 'Error',
    }),
  },
  warning: {
    type: 'warning',
    color: 'warning',
    label: i18n.translate('presentationPanelMessage.warningIconAriaLabel', {
      defaultMessage: 'Warning',
    }),
  },
  info: {
    type: 'info',
    color: 'primary',
    label: i18n.translate('presentationPanelMessage.infoIconAriaLabel', {
      defaultMessage: 'Information',
    }),
  },
};

const VIEW_DETAILS_LABEL = i18n.translate('presentationPanelMessage.viewDetailsLinkLabel', {
  defaultMessage: 'View details',
});

const styles = {
  wrapper: css({
    display: 'flex',
    width: '100%',
    height: '100%',
    overflow: 'auto',
  }),
};

/** Shared message for dashboard panel states, such as errors, warnings and expected empty states. */
export const PanelMessage = ({
  severity,
  title,
  body,
  icon,
  primaryAction,
  secondaryActions = [],
  onViewDetails,
  'data-test-subj': dataTestSubj = 'panelMessage',
}: PanelMessageProps): JSX.Element => {
  const { type: iconType, color: iconColor, label: iconLabel } = SEVERITY_ICONS[severity];

  const links: readonly PanelMessageAction[] = onViewDetails
    ? [
        ...secondaryActions,
        {
          label: VIEW_DETAILS_LABEL,
          onClick: onViewDetails,
          'data-test-subj': `${dataTestSubj}-viewDetails`,
        },
      ]
    : secondaryActions;

  // Each link is appended through a translated message, so translators control the spacing and
  // punctuation around it.
  const bodyWithLinks = links.reduce<ReactNode>(
    (content, { label, onClick, href, 'data-test-subj': linkTestSubj }) => (
      <FormattedMessage
        id="presentationPanelMessage.bodyWithLink"
        defaultMessage="{body} {link}."
        description="Appends a link as its own short sentence after the body of a panel message, for example 'The query has an error. View details.'"
        values={{
          body: content,
          link: (
            <EuiLink href={href} onClick={onClick} data-test-subj={linkTestSubj}>
              {label}
            </EuiLink>
          ),
        }}
      />
    ),
    body
  );

  return (
    <div css={styles.wrapper} data-test-subj={dataTestSubj} data-severity={severity}>
      <EuiEmptyPrompt
        color="plain"
        hasBorder={false}
        layout="vertical"
        paddingSize="s"
        titleSize="xxs"
        icon={
          icon ?? (
            <EuiIcon
              type={iconType}
              color={iconColor}
              size="l"
              aria-label={iconLabel}
              data-test-subj={`${dataTestSubj}-icon`}
            />
          )
        }
        title={<h2 data-test-subj={`${dataTestSubj}-title`}>{title}</h2>}
        body={<p data-test-subj={`${dataTestSubj}-body`}>{bodyWithLinks}</p>}
        actions={
          primaryAction ? (
            <EuiButton
              color="text"
              size="s"
              href={primaryAction.href}
              onClick={primaryAction.onClick}
              data-test-subj={primaryAction['data-test-subj'] ?? `${dataTestSubj}-primaryAction`}
            >
              {primaryAction.label}
            </EuiButton>
          ) : undefined
        }
      />
    </div>
  );
};
