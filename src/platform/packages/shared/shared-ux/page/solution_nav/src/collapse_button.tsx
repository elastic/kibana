/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import {
  EuiButtonIcon,
  EuiButtonIconPropsForButton,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type SolutionNavCollapseButtonProps = Partial<EuiButtonIconPropsForButton> & {
  /**
   * Boolean state of current collapsed status
   */
  isCollapsed: boolean;
};

const collapseLabel = i18n.translate('sharedUXPackages.solutionNav.collapsibleLabel', {
  defaultMessage: 'Collapse side navigation',
});

const openLabel = i18n.translate('sharedUXPackages.solutionNav.openLabel', {
  defaultMessage: 'Open side navigation',
});

/**
 * Creates the styled icon button for showing/hiding solution nav
 */
export const SolutionNavCollapseButton = React.memo(
  ({ className, isCollapsed, ...rest }: SolutionNavCollapseButtonProps) => {
    const { euiTheme } = useEuiTheme();
    const solutionNavWidth = '248px';

    const styles = useMemo(
      () => ({
        base: css`
          position: absolute;
          opacity: 0;
          left: calc(${solutionNavWidth} - ${euiTheme.size.base});
          top: ${euiTheme.size.l};
          z-index: 2;

          ${euiCanAnimate} {
            transition: opacity ${euiTheme.animation.fast}, left ${euiTheme.animation.fast},
              background ${euiTheme.animation.fast};
          }

          &:hover,
          &:focus {
            transition-delay: 0s !important;
          }

          .kbnSolutionNav__sidebar:hover &,
          &:hover,
          &:focus {
            opacity: 1;
            left: calc(${solutionNavWidth} - ${euiTheme.size.l});
          }

          .kbnSolutionNav__sidebar:hover & {
            transition-delay: ${euiTheme.animation.slow} * 2;
          }
        `,
        isCollapsed: css`
          opacity: 1 !important;
          transition-delay: 0s !important;
          left: 0 !important;
          right: auto;
          top: 0;
          bottom: 0;
          height: 100%;
          width: ${euiTheme.size.xxl};
          border-radius: 0;
          padding-top: calc(${euiTheme.size.l} + ${euiTheme.size.s});
          align-items: flex-start;
        `,
        notCollapsed: css`
          background-color: ${euiTheme.colors.backgroundBasePlain} !important;
        `,
      }),
      [euiTheme]
    );

    const computedStyles = useMemo(
      () => [styles.base, isCollapsed && styles.isCollapsed, !isCollapsed && styles.notCollapsed],
      [styles, isCollapsed]
    );

    const buttonLabels = useMemo(
      () => ({
        ariaLabel: isCollapsed ? openLabel : collapseLabel,
        title: isCollapsed ? openLabel : collapseLabel,
      }),
      [isCollapsed]
    );

    const iconType = useMemo(() => (isCollapsed ? 'menuRight' : 'menuLeft'), [isCollapsed]);

    return (
      <EuiButtonIcon
        className={className}
        css={computedStyles}
        size="s"
        color="text"
        iconType={iconType}
        aria-label={buttonLabels.ariaLabel}
        title={buttonLabels.title}
        {...rest}
      />
    );
  }
);

SolutionNavCollapseButton.displayName = 'SolutionNavCollapseButton';
