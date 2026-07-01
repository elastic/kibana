/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

interface Props {
  onRefresh: () => void;
}

// Temporary, quickly drafted, details and final implementation TBD
const KeyboardShortcut = ({ keys }: { keys: string[] }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {keys.map((key, i) => (
        <EuiFlexItem key={i} grow={false}>
          <span
            css={css`
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-width: ${euiTheme.size.l};
              height: ${euiTheme.size.l};
              padding: 0 ${euiTheme.size.xs};
              border-radius: ${euiTheme.border.radius.small};
              background: ${euiTheme.colors.lightShade};
              font-size: ${euiTheme.size.m};
              font-weight: ${euiTheme.font.weight.medium};
            `}
          >
            {key}
          </span>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

const shortcuts = [
  { label: 'Run query', keys: ['⌘', '⏎'] },
  { label: 'Comment/uncomment', keys: ['⌘', '/'] },
  { label: 'Open quick search', keys: ['⌘', 'k'] },
  { label: 'Prettify query', keys: ['⌘', 'i'] },
];

export const DiscoverUninitialized = ({ onRefresh }: Props) => {
  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      css={css`
        height: 100%;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="s" textAlign="center">
              <strong>
                <FormattedMessage
                  id="discover.uninitialized.keyboardShortcutsTitle"
                  defaultMessage="Keyboard shortcuts"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiSpacer size="s" />
          {shortcuts.map(({ label, keys }) => (
            <EuiFlexItem key={label} grow={false}>
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                gutterSize="l"
                responsive={false}
                css={css`
                  min-width: 200px;
                `}
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{label}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <KeyboardShortcut keys={keys} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem
        grow
        css={css`
          justify-content: center;
        `}
      >
        <EuiEmptyPrompt
          iconType="discoverApp"
          title={
            <h2>
              <FormattedMessage id="discover.uninitializedTitle" defaultMessage="Start searching" />
            </h2>
          }
          body={
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="discover.uninitializedText"
                  defaultMessage="Write a query, add some filters, or simply hit Refresh to retrieve results for the current query."
                />
              </p>
            </EuiText>
          }
          actions={
            <EuiButton color="primary" fill onClick={onRefresh} data-test-subj="refreshDataButton">
              <FormattedMessage
                id="discover.uninitializedRefreshButtonText"
                defaultMessage="Refresh data"
              />
            </EuiButton>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
