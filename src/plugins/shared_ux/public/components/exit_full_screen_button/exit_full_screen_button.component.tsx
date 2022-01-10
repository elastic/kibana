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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
  makeHighContrastColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import cx from 'classnames';

import './exit_full_screen_button.scss';

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
  const { colors, size, border } = euiTheme;

  const textCSS = css`
    line-height: 1.2;
    ${makeHighContrastColor(colors.mediumShade)(colors.fullShade)};
  `;

  const iconCSS = css`
    ${makeHighContrastColor(colors.mediumShade)(colors.fullShade)};
  `;

  const buttonCSS = css`
    display: inline-block;
    padding: ${size.xs} ${size.s};
    border: none;
    background: none;
    background: ${colors.fullShade};
    border-radius: ${border.radius.small};
    text-align: left;
    height: 32px;
    color: ${colors.lightShade};

    &:hover {
      background: ${colors.fullShade};
      color: ${colors.emptyShade};
    }
  `;

  return (
    <div css={buttonCSS} className={cx('exitFullScreenButton', className)}>
      <EuiScreenReaderOnly>
        <p aria-live="polite">{description}</p>
      </EuiScreenReaderOnly>
      <button aria-label={label} onClick={onClick}>
        <EuiFlexGroup component="span" responsive={false} alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoElastic" size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj="exitFullScreenModeText">
            <EuiText size="s" css={textCSS}>
              {text}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="fullScreen" css={iconCSS} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </button>
    </div>
  );
};
