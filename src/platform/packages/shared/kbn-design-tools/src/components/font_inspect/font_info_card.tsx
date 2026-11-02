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
import { EuiButtonIcon, EuiPanel, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DEVTOOL_IGNORE_ATTR } from '../../lib/constants';
import type { FontInfo } from '../../lib/dom/get_font_info';
import { parsePx } from '../../lib/dom/round_px_value';

interface Props {
  fontInfo: FontInfo;
  isPinned: boolean;
  onClose?: () => void;
}

const shouldShowLetterSpacing = (letterSpacing: string): boolean => {
  if (letterSpacing === 'normal' || letterSpacing === '0px' || letterSpacing === '0') {
    return false;
  }
  return parsePx(letterSpacing) !== 0;
};

interface FontMetricRowProps {
  label: string;
  value: string;
  familyCode: string;
}

const FontMetricRow = ({ label, value, familyCode }: FontMetricRowProps) => (
  <div
    css={css({
      display: 'flex',
      gap: '8px',
      justifyContent: 'space-between',
    })}
  >
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiText
      size="xs"
      css={css({
        fontFamily: familyCode,
      })}
    >
      {value}
    </EuiText>
  </div>
);

/**
 * Floating panel showing computed font metrics for the inspected element.
 */
export const FontInfoCard = ({ fontInfo, isPinned, onClose }: Props) => {
  const { euiTheme } = useEuiTheme();
  const familyCode = euiTheme.font.familyCode ?? 'monospace';
  const showLetterSpacing = shouldShowLetterSpacing(fontInfo.letterSpacing);
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
            marginBottom: euiTheme.size.xs,
          })}
        >
          <div css={css({ flex: 1, minWidth: 0 })}>
            <EuiText size="s">
              <strong>{fontInfo.resolvedFamily}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {fontInfo.fontFamily}
            </EuiText>
          </div>
          {isPinned && onClose && (
            <EuiToolTip content={closeAriaLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                size="xs"
                aria-label={closeAriaLabel}
                onClick={onClose}
                data-test-subj="fontInfoCardClose"
              />
            </EuiToolTip>
          )}
        </div>
        <div
          css={css({
            display: 'flex',
            flexDirection: 'column',
            gap: euiTheme.size.xxs,
          })}
        >
          <FontMetricRow
            label={i18n.translate('kbnDesignTools.fontInspect.card.size', {
              defaultMessage: 'Size',
            })}
            value={fontInfo.fontSize}
            familyCode={familyCode}
          />
          <FontMetricRow
            label={i18n.translate('kbnDesignTools.fontInspect.card.weight', {
              defaultMessage: 'Weight',
            })}
            value={fontInfo.fontWeight}
            familyCode={familyCode}
          />
          <FontMetricRow
            label={i18n.translate('kbnDesignTools.fontInspect.card.lineHeight', {
              defaultMessage: 'Line height',
            })}
            value={fontInfo.lineHeight}
            familyCode={familyCode}
          />
          {showLetterSpacing && (
            <FontMetricRow
              label={i18n.translate('kbnDesignTools.fontInspect.card.letterSpacing', {
                defaultMessage: 'Letter spacing',
              })}
              value={fontInfo.letterSpacing}
              familyCode={familyCode}
            />
          )}
        </div>
      </EuiPanel>
    </div>
  );
};
