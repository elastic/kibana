/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css, SerializedStyles } from '@emotion/react';
import { getSearchErrorOverrideDisplay } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import React, { ReactNode, useState } from 'react';
import { useDiscoverServices } from '../../hooks/use_discover_services';

export interface ErrorCalloutProps {
  title: string;
  error: Error;
  inline?: boolean;
  'data-test-subj'?: string;
}

export const ErrorCallout = ({
  title,
  error,
  inline,
  'data-test-subj': dataTestSubj,
}: ErrorCalloutProps) => {
  const { core } = useDiscoverServices();
  const { euiTheme } = useEuiTheme();

  const showErrorMessage = i18n.translate('discover.errorCalloutShowErrorMessage', {
    defaultMessage: 'Show details',
  });

  const overrideDisplay = getSearchErrorOverrideDisplay({
    error,
    application: core.application,
  });

  const [overridePopoverOpen, setOverridePopoverOpen] = useState(false);

  const showError = overrideDisplay?.body
    ? () => setOverridePopoverOpen((isOpen) => !isOpen)
    : () => core.notifications.showErrorDialog({ title, error });

  let formattedTitle: ReactNode = overrideDisplay?.title || title;
  let body: ReactNode;
  let calloutCss: SerializedStyles | undefined;

  if (inline) {
    const formattedTitleMessage = overrideDisplay
      ? formattedTitle
      : i18n.translate('discover.errorCalloutFormattedTitle', {
          defaultMessage: '{title}: {errorMessage}',
          values: { title, errorMessage: error.message },
        });

    let link = (
      <EuiLink
        onClick={showError}
        css={css`
          white-space: nowrap;
          margin-inline-start: ${euiTheme.size.s};
        `}
      >
        {showErrorMessage}
      </EuiLink>
    );

    if (overrideDisplay?.body) {
      link = (
        <EuiPopover
          isOpen={overridePopoverOpen}
          closePopover={() => setOverridePopoverOpen(false)}
          button={link}
          panelProps={{
            css: css`
              max-width: ${euiTheme.base * 30}px;
            `,
          }}
        >
          <EuiPopoverTitle>{overrideDisplay.title}</EuiPopoverTitle>
          <EuiText>{overrideDisplay.body}</EuiText>
        </EuiPopover>
      );
    }

    formattedTitle = (
      <>
        <span className="eui-textTruncate" data-test-subj="discoverErrorCalloutMessage">
          {formattedTitleMessage}
        </span>
        {link}
      </>
    );

    calloutCss = css`
      .euiTitle {
        display: flex;
        align-items: center;
      }
    `;
  } else {
    body = overrideDisplay?.body ?? (
      <>
        <p data-test-subj="discoverErrorCalloutMessage">{error.message}</p>
        <EuiButton size="s" color="danger" onClick={showError}>
          {showErrorMessage}
        </EuiButton>
      </>
    );
  }

  return (
    <EuiCallOut
      title={formattedTitle}
      heading="h3"
      color="danger"
      iconType="error"
      size={inline ? 's' : undefined}
      children={body}
      css={calloutCss}
      data-test-subj={dataTestSubj}
    />
  );
};
