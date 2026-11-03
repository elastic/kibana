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
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiThemeProvider,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DEVTOOL_IGNORE_ATTR } from '../../lib/constants';
import { getPageColorMode } from '../../lib/dom/get_page_color_mode';
import { useDesignTokenSections } from '../../hooks/use_design_token_sections';

interface Props {
  element: HTMLElement;
  isPinned: boolean;
  onClose?: () => void;
}

const NO_EUI_TOKEN = '—';

const FontInfoCardPanel = ({ element, isPinned, onClose }: Props) => {
  const { euiTheme } = useEuiTheme();
  const isLightPage = getPageColorMode() === 'light';
  const familyCode = euiTheme.font.familyCode ?? 'monospace';
  const { fontFamily, rows } = useDesignTokenSections(element);
  const closeAriaLabel = i18n.translate('kbnDesignTools.fontInspect.card.closeAriaLabel', {
    defaultMessage: 'Unpin',
  });
  const showCloseButton = isPinned && Boolean(onClose);
  const valueFontCss = css({ fontFamily: familyCode });
  const tokenGridCss = css({
    display: 'grid',
    width: '100%',
    gridTemplateColumns: 'auto auto 1fr',
    columnGap: euiTheme.size.l,
    rowGap: euiTheme.size.xxs,
    alignItems: 'center',
  });

  const pinnedPanelCss = isPinned
    ? css({
        border: `2px solid ${euiTheme.colors.success}`,
      })
    : undefined;

  return (
    <div {...{ [DEVTOOL_IGNORE_ATTR]: '' }} data-test-subj="fontInfoCard">
      <EuiPanel
        paddingSize="s"
        hasShadow
        color={isLightPage ? 'plain' : undefined}
        css={pinnedPanelCss}
      >
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{fontFamily}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={closeAriaLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                size="xs"
                aria-label={closeAriaLabel}
                aria-hidden={showCloseButton ? undefined : true}
                disabled={!showCloseButton}
                onClick={showCloseButton ? onClose : undefined}
                data-test-subj="fontInfoCardClose"
                css={showCloseButton ? undefined : css({ visibility: 'hidden' })}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <div css={tokenGridCss}>
          {rows.map((row, index) => (
            <React.Fragment key={index}>
              <EuiText size="xs" color="subdued">
                {row.label}
              </EuiText>
              <EuiText size="xs" css={valueFontCss}>
                {row.euiToken ?? NO_EUI_TOKEN}
              </EuiText>
              <EuiFlexGroup
                gutterSize="xs"
                alignItems="center"
                justifyContent="flexEnd"
                responsive={false}
              >
                {row.swatchColor && (
                  <EuiIcon type="stopFill" color={row.swatchColor} size="s" aria-hidden />
                )}
                <EuiCode>{row.cssValue}</EuiCode>
              </EuiFlexGroup>
            </React.Fragment>
          ))}
        </div>
      </EuiPanel>
    </div>
  );
};

/**
 * Floating panel showing an inspected element's font family and metrics.
 */
export const FontInfoCard = (props: Props) => (
  <EuiThemeProvider colorMode={getPageColorMode()}>
    <FontInfoCardPanel {...props} />
  </EuiThemeProvider>
);
