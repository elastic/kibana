/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { MouseEventHandler, HTMLAttributes } from 'react';
import {
  EuiScreenReaderOnly,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
  makeHighContrastColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

const label = i18n.translate('sharedUX.exitFullScreenButton.exitFullScreenModeButtonAriaLabel', {
  defaultMessage: 'Exit full screen mode',
});

const text = i18n.translate('sharedUX.exitFullScreenButton.exitFullScreenModeButtonText', {
  defaultMessage: 'Exit full screen',
});

const description = i18n.translate('sharedUX.exitFullScreenButton.fullScreenModeDescription', {
  defaultMessage: 'In full screen mode, press ESC to exit.',
});

/**
 * Props for the Exit Full Screen button component.
 */
export interface Props extends Pick<HTMLAttributes<HTMLDivElement>, 'className'> {
  onClick: MouseEventHandler<HTMLButtonElement>;
}

/**
 * A presentational component that renders a button designed to exit "full screen" mode.
 */
export const ExitFullScreenButton = ({ onClick, className }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { colors, size } = euiTheme;

  const textCSS = css`
    ${makeHighContrastColor(colors.mediumShade)(colors.fullShade)};
  `;

  const buttonCSS = css`
    &.euiButton {
      &:hover,
      &:focus,
      &:focus-within {
        text-decoration: none;
      }
      .euiButton__content {
        padding: 0 ${size.s};
      }
    }

    &.euiButton--text {
      background-color: ${colors.fullShade};
      color: ${makeHighContrastColor(colors.mediumShade)(colors.fullShade)};

      &:hover,
      &:focus,
      &:focus-within {
        background-color: ${colors.fullShade};
        color: ${makeHighContrastColor(colors.lightestShade)(colors.fullShade)};
      }
    }
  `;

  return (
    <div {...{ className }}>
      <EuiScreenReaderOnly>
        <p aria-live="polite">{description}</p>
      </EuiScreenReaderOnly>
      <EuiButton
        aria-label={label}
        data-test-subj="exitFullScreenModeLogo"
        color="text"
        css={buttonCSS}
        iconSide="right"
        iconType="fullScreen"
        onClick={onClick}
        size="s"
      >
        <EuiFlexGroup component="span" responsive={false} alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoElastic" size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj="exitFullScreenModeText">
            <EuiText size="s" css={textCSS}>
              {text}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiButton>
    </div>
  );
};
