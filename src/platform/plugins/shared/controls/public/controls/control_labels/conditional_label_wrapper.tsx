/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  euiTextTruncate,
  useGeneratedHtmlId,
  type UseEuiTheme,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { css } from '@emotion/react';
import { ControlLabelTooltip, useIndicateRelatedPanelsSelector } from '@kbn/controls-renderer';
import { i18n } from '@kbn/i18n';

export const ConditionalLabelWrapper = ({
  isPinned,
  label,
  children,
  api,
  tooltipLabel,
}: React.PropsWithChildren<{
  isPinned: boolean;
  label: string | undefined;
  api?: unknown;
  tooltipLabel?: string;
}>) => {
  const styles = useMemoCss(labelWrapperStyles);
  const {
    canIndicateRelatedPanels,
    isIndicatingRelatedPanels,
    onToggleIndicateRelatedPanels,
    numberOfRelatedPanels,
  } = useIndicateRelatedPanelsSelector(api);

  const enableIndicateRelatedPanels = Boolean(canIndicateRelatedPanels && numberOfRelatedPanels);

  const linkTextRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useGeneratedHtmlId({});

  const unpinnedLabel = canIndicateRelatedPanels ? (
    <EuiFlexItem css={styles.disableGrow}>
      {/* Use tabIndex -1 on the EUI Link so that the <span> can be the keyboard focusable interactive element.
          This allows us to anchor the tooltip to the span for display purposes, and have it function
          properly with keyboard use
        */}
      {/* eslint-disable-next-line @elastic/eui/accessible-interactive-element */}
      <EuiLink
        css={[styles.clickableLabel]}
        color={isIndicatingRelatedPanels ? 'text' : 'subdued'}
        onClick={enableIndicateRelatedPanels ? onToggleIndicateRelatedPanels : undefined}
        tabIndex={-1}
      >
        <ControlLabelTooltip
          canIndicateRelatedPanels={canIndicateRelatedPanels}
          isIndicatingRelatedPanels={isIndicatingRelatedPanels}
          numberOfRelatedPanels={numberOfRelatedPanels}
          panelLabel={label}
          panelTooltipLabel={tooltipLabel}
          id={tooltipId}
        >
          <span
            onKeyDown={(e) =>
              enableIndicateRelatedPanels && (e.key === 'Enter' || e.key === ' ')
                ? onToggleIndicateRelatedPanels()
                : null
            }
            css={styles.clickableLabelInner}
            role="button"
            tabIndex={0}
            ref={linkTextRef}
          >
            {label}{' '}
            {canIndicateRelatedPanels && numberOfRelatedPanels === 0 && (
              <EuiIcon
                size="s"
                aria-label={i18n.translate('controls.controlGroup.warningNoRelatedPanels', {
                  defaultMessage: 'Warning: No related panels',
                })}
                type="warning"
              />
            )}
          </span>
        </ControlLabelTooltip>
      </EuiLink>
    </EuiFlexItem>
  ) : (
    <EuiFlexItem css={styles.disableGrow}>
      <EuiText size="s" color="subdued" css={styles.label} component="p">
        {label}
      </EuiText>
    </EuiFlexItem>
  );

  return isPinned ? (
    children
  ) : (
    <EuiFlexGroup
      direction="column"
      css={[styles.flexGroup, canIndicateRelatedPanels ? styles.disablePadding : null]}
    >
      {unpinnedLabel}
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const labelWrapperStyles = {
  flexGroup: ({ euiTheme }: UseEuiTheme) =>
    css({
      gap: '1px',
      padding: `${euiTheme.size.xs} 0 1px 0`,
      overflow: 'hidden',
    }),
  disablePadding: css({ padding: 0, gap: 0 }),
  disableGrow: css({ flexGrow: 0 }),
  label: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: `0 ${euiTheme.size.s}`,
      lineHeight: '1.2rem',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    }),
  clickableLabel: ({ euiTheme }: UseEuiTheme) =>
    css`
      ${euiTextTruncate()};
      padding: ${euiTheme.size.xs} ${euiTheme.size.s} 1px;
      font-weight: ${euiTheme.font.weight.regular};
      padding-bottom: ${euiTheme.size.xxs};
      margin-bottom: -${euiTheme.size.xxs};
      z-index: 1;
      /* Style the button as focused when the inner span is in focus */
      &:focus-visible,
      &:has(:focus-visible) {
        outline: 2px solid ${euiTheme.colors.primary};
        outline-offset: -${euiTheme.size.xxs};
      }
    `,
  clickableLabelInner: ({ euiTheme }: UseEuiTheme) =>
    css`
      /* Apply focus outline to the button instead */
      &:focus-visible {
        outline: none;
      }
    `,
};
