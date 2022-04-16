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
  useEuiTheme,
  makeHighContrastColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import cx from 'classnames';

import './exit_full_screen_button.scss';

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
 * Props for the `ExitFullScreenButton` component.
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

  const buttonCSS = css`
    padding: ${size.xs} ${size.s};
    background: ${colors.fullShade};
    border-radius: ${border.radius.small};
    height: ${size.xl};
    color: ${makeHighContrastColor(colors.emptyShade)(colors.fullShade)};
    outline-color: ${colors.emptyShade};
  `;

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
            <EuiIcon type="logoElastic" size="m" />
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
