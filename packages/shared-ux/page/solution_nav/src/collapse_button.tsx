/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './collapse_button.scss';

import React from 'react';
import classNames from 'classnames';

import { EuiButtonIcon, EuiButtonIconPropsForButton } from '@elastic/eui';
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
export const SolutionNavCollapseButton = ({
  className,
  isCollapsed,
  ...rest
}: SolutionNavCollapseButtonProps) => {
  const classes = classNames(
    'kbnSolutionNavCollapseButton',
    {
      'kbnSolutionNavCollapseButton-isCollapsed': isCollapsed,
    },
    className
  );

  return (
    <EuiButtonIcon
      className={classes}
      size="s"
      color="text"
      iconType={isCollapsed ? 'menuRight' : 'menuLeft'}
      aria-label={isCollapsed ? openLabel : collapseLabel}
      title={isCollapsed ? openLabel : collapseLabel}
      {...rest}
    />
  );
};
