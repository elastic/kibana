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
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { renderSearchError } from '@kbn/search-errors';
import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import React from 'react';

export interface ErrorCalloutProps {
  title: string;
  error: Error;
  isEsqlMode?: boolean;
  /** When set, renders the "View details" action (non-ES|QL mode only). */
  showErrorDialog?: (args: { title: string; error: Error }) => void;
  /** Doc link for the ES|QL reference button. Used when `isEsqlMode` is true. */
  esqlReferenceHref?: string;
  /** Extra content under the error message, such as an AI explanation of it. It makes the callout wider. */
  aiHelp?: ReactNode;
}

const WIDE_CALLOUT_MAX_WIDTH = '48rem';

export const ErrorCallout = ({
  title,
  error,
  isEsqlMode,
  showErrorDialog,
  esqlReferenceHref,
  aiHelp,
}: ErrorCalloutProps) => {
  const { euiTheme } = useEuiTheme();
  const searchErrorDisplay = renderSearchError(error);

  const heading = (
    <h2 data-test-subj="discoverErrorCalloutTitle">{searchErrorDisplay?.title ?? title}</h2>
  );
  const actions = searchErrorDisplay?.actions ?? [];
  const message = searchErrorDisplay?.body ?? (
    <>
      <EuiCodeBlock
        paddingSize="s"
        language="json"
        isCopyable
        css={css`
          text-align: left;
        `}
        data-test-subj="discoverErrorCalloutMessage"
      >
        {error.message}
      </EuiCodeBlock>
      {!isEsqlMode && showErrorDialog ? (
        <EuiButton
          onClick={() => showErrorDialog({ title, error })}
          data-test-subj="discoverErrorCalloutShowDetailsButton"
        >
          {i18n.translate('discover.errorCalloutShowErrorMessage', {
            defaultMessage: 'View details',
          })}
        </EuiButton>
      ) : null}
    </>
  );
  const footer =
    isEsqlMode && esqlReferenceHref ? (
      <EuiButtonEmpty
        iconType="documentation"
        href={esqlReferenceHref}
        data-test-subj="discoverErrorCalloutESQLReferenceButton"
        target="_blank"
      >
        {i18n.translate('discover.errorCalloutESQLReferenceButtonLabel', {
          defaultMessage: 'Open ES|QL reference',
        })}
      </EuiButtonEmpty>
    ) : undefined;

  if (!aiHelp) {
    return (
      <EuiEmptyPrompt
        icon={<EuiIcon size="l" type="error" color="danger" aria-hidden={true} />}
        color="plain"
        paddingSize="m"
        css={css`
          margin: ${euiTheme.size.xl} auto;
        `}
        title={heading}
        titleSize="xs"
        hasBorder
        actions={actions}
        body={message}
        footer={footer}
      />
    );
  }

  return (
    <EuiPanel
      color="plain"
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={css`
        margin: ${euiTheme.size.xl} auto;
        max-inline-size: min(${WIDE_CALLOUT_MAX_WIDTH}, calc(100% - ${euiTheme.size.xl}));
        overflow: hidden;
      `}
      data-test-subj="discoverErrorCalloutWide"
    >
      <div
        css={css`
          padding: ${euiTheme.size.m};
          text-align: center;
        `}
      >
        <EuiIcon size="l" type="error" color="danger" aria-hidden={true} />
        <EuiSpacer size="s" />
        <EuiTitle size="xs">{heading}</EuiTitle>
        <EuiSpacer size="m" />
        {message}
        {actions.length > 0 ? (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" justifyContent="center" responsive={false} wrap>
              {actions.map((action, index) => (
                <EuiFlexItem grow={false} key={index}>
                  {action}
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        ) : null}
        <EuiSpacer size="m" />
        {aiHelp}
      </div>
      {footer ? (
        <div
          css={css`
            padding: ${euiTheme.size.s} ${euiTheme.size.m};
            text-align: center;
            background: ${euiTheme.colors.backgroundBaseSubdued};
            border-block-start: ${euiTheme.border.thin};
          `}
        >
          {footer}
        </div>
      ) : null}
    </EuiPanel>
  );
};
