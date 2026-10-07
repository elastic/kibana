/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface ToolCardProps {
  iconType: string;
  name?: string;
  id?: string;
  /** Text copied by the card's copy button; the button is hidden when omitted. */
  copyText?: string;
  copyLabel?: string;
  children?: React.ReactNode;
  'data-test-subj'?: string;
}

/** Bordered card for a single tool invocation or result, headed by the tool name and call ID. */
export function GenAiToolCard({
  iconType,
  name,
  id,
  copyText,
  copyLabel,
  children,
  'data-test-subj': dataTestSubj,
}: ToolCardProps) {
  const { euiTheme } = useEuiTheme();
  const codeFontCss = css`
    font-family: ${euiTheme.font.familyCode};
  `;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none" data-test-subj={dataTestSubj}>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.xs} ${euiTheme.size.s};
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
          border-bottom: ${children != null ? euiTheme.border.thin : 'none'};
          border-radius: ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0 0;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="s" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
          <EuiText size="xs" css={[codeFontCss, { overflowWrap: 'anywhere' }]}>
            <strong>
              {name ??
                i18n.translate('apmUiShared.genAi.messages.unknownTool', {
                  defaultMessage: 'Unknown tool',
                })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        {id && (
          <EuiFlexItem css={{ minWidth: 0, alignItems: 'flex-end' }}>
            <EuiText
              size="xs"
              color="subdued"
              css={[codeFontCss, { overflowWrap: 'anywhere', textAlign: 'right' }]}
            >
              {id}
            </EuiText>
          </EuiFlexItem>
        )}
        {copyText != null && copyLabel && (
          <EuiFlexItem grow={false} css={id ? undefined : { marginLeft: 'auto' }}>
            <EuiCopy textToCopy={copyText}>
              {(copy) => (
                <EuiToolTip content={copyLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="copy"
                    color="text"
                    size="xs"
                    aria-label={copyLabel}
                    data-test-subj={dataTestSubj ? `${dataTestSubj}Copy` : undefined}
                    onClick={copy}
                  />
                </EuiToolTip>
              )}
            </EuiCopy>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {children != null && (
        <div
          css={css`
            padding: ${euiTheme.size.s};
          `}
        >
          {children}
        </div>
      )}
    </EuiPanel>
  );
}
