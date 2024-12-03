/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiScreenReaderOnly,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  useEuiTheme,
  useEuiShadow,
  makeHighContrastColor,
} from '@elastic/eui';
// EUI allows reaching into internal folders for component-specific exports, but they aren't typed in Kibana
// @ts-ignore
import { useEuiButtonFocusCSS } from '@elastic/eui/lib/themes/amsterdam/global_styling/mixins/button';
// @ts-ignore
import { euiButtonDisplayStyles } from '@elastic/eui/lib/components/button/button_display/_button_display.styles';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import cx from 'classnames';

import type { ExitFullScreenButtonComponentProps as Props } from '../types';

const text = i18n.translate('sharedUXPackages.exitFullScreenButton.exitFullScreenModeButtonText', {
  defaultMessage: 'Exit full screen',
});

const description = i18n.translate(
  'sharedUXPackages.exitFullScreenButton.fullScreenModeDescription',
  {
    defaultMessage: 'In full screen mode, press ESC to exit.',
  }
);

/**
 * A presentational component that renders a button designed to exit "full screen" mode.
 */
export const ExitFullScreenButton = ({ onClick, className, customLogo }: Props) => {
  const euiThemeContext = useEuiTheme();
  const { euiButtonDisplay } = euiButtonDisplayStyles(euiThemeContext);
  const { colors, size, border } = euiThemeContext.euiTheme;

  const buttonCSS = [
    euiButtonDisplay,
    css`
      padding: ${size.xs} ${size.s};
      background: ${colors.fullShade};
      border-radius: ${border.radius.small};
      height: ${size.xl};
      color: ${makeHighContrastColor(colors.emptyShade)(colors.fullShade)};
      outline-color: ${colors.emptyShade};
    `,
    useEuiShadow('l'),
    useEuiButtonFocusCSS(),
  ];

  return (
    <div>
      <EuiScreenReaderOnly>
        <p aria-live="polite">{description}</p>
      </EuiScreenReaderOnly>
      <button
        css={buttonCSS}
        className={cx('exitFullScreenButton', className)}
        onClick={onClick}
        data-test-subj="exitFullScreenModeButton"
      >
        <EuiFlexGroup component="span" responsive={false} alignItems="center" gutterSize="s">
          <EuiFlexItem component="span" grow={false}>
            {customLogo ? (
              <EuiImage src={customLogo} size={16} alt="customLogo" />
            ) : (
              <EuiIcon type="logoElastic" size="m" />
            )}
          </EuiFlexItem>
          <EuiFlexItem component="span" grow={false} data-test-subj="exitFullScreenModeText">
            {text}
          </EuiFlexItem>
          <EuiFlexItem component="span" grow={false}>
            <EuiIcon type="fullScreenExit" size="s" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </button>
    </div>
  );
};
