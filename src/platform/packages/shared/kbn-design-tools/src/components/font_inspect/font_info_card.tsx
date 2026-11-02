/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DEVTOOL_IGNORE_ATTR } from '../../lib/constants';
import { useDesignTokenSections } from '../../hooks/use_design_token_sections';
import type { TokenRow as TokenRowData } from '../../hooks/use_design_token_sections';

interface Props {
  element: HTMLElement;
  isPinned: boolean;
  onClose?: () => void;
}

interface TokenRowProps extends TokenRowData {
  familyCode: string;
}

const TokenRow = ({ label, value, token, swatchColor, familyCode }: TokenRowProps) => (
  <div
    css={css({
      display: 'flex',
      gap: '8px',
      justifyContent: 'space-between',
      alignItems: 'center',
    })}
  >
    <EuiText size="xs" color="subdued">
      {token ?? label}
    </EuiText>
    <div
      css={css({
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      })}
    >
      {swatchColor && (
        <EuiIcon type="stopFill" color={swatchColor} size="s" aria-hidden css={css({ flexShrink: 0 })} />
      )}
      <EuiText
        size="xs"
        css={css({
          fontFamily: familyCode,
        })}
      >
        {value}
      </EuiText>
    </div>
  </div>
);

/**
 * Floating panel showing an inspected element's font family and metrics.
 */
export const FontInfoCard = ({ element, isPinned, onClose }: Props) => {
  const { euiTheme } = useEuiTheme();
  const familyCode = euiTheme.font.familyCode ?? 'monospace';
  const { fontFamily, rows } = useDesignTokenSections(element);
  const closeAriaLabel = i18n.translate('kbnDesignTools.fontInspect.card.closeAriaLabel', {
    defaultMessage: 'Unpin font inspect',
  });

  return (
    <div {...{ [DEVTOOL_IGNORE_ATTR]: '' }} data-test-subj="fontInfoCard">
      <EuiPanel paddingSize="s" hasShadow>
        <div
          css={css({
            display: 'flex',
            alignItems: 'flex-start',
            gap: euiTheme.size.s,
          })}
        >
          <EuiText size="s" css={css({ flex: 1, minWidth: 0 })}>
            <strong>{fontFamily}</strong>
          </EuiText>
          <div css={css({ flexShrink: 0, lineHeight: 0 })}>
            {isPinned && onClose ? (
              <EuiToolTip content={closeAriaLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="cross"
                  size="xs"
                  aria-label={closeAriaLabel}
                  onClick={onClose}
                  data-test-subj="fontInfoCardClose"
                />
              </EuiToolTip>
            ) : (
              <EuiButtonIcon
                iconType="cross"
                size="xs"
                disabled
                aria-hidden
                css={css({ visibility: 'hidden' })}
              />
            )}
          </div>
        </div>
        <div
          css={css({
            display: 'flex',
            flexDirection: 'column',
            gap: euiTheme.size.xxs,
            marginTop: euiTheme.size.s,
          })}
        >
          {rows.map((row, index) => (
            <TokenRow key={index} {...row} familyCode={familyCode} />
          ))}
        </div>
      </EuiPanel>
    </div>
  );
};
