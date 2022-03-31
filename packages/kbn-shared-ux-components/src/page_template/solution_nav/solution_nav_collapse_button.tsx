/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './solution_nav_collapse_button.scss';

import React from 'react';
import classNames from 'classnames';

import { EuiButtonIcon, EuiButtonIconPropsForButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type KibanaPageTemplateSolutionNavCollapseButtonProps =
  Partial<EuiButtonIconPropsForButton> & {
    /**
     * Boolean state of current collapsed status
     */
    collapsed: boolean;
  };

const collapseLabel = i18n.translate('sharedUXComponents.solutionNav.collapsibleLabel', {
  defaultMessage: 'Collapse side navigation',
});

const openLabel = i18n.translate('sharedUXComponents.solutionNav.openLabel', {
  defaultMessage: 'Open side navigation',
});

/**
 * Creates the styled icon button for showing/hiding solution nav
 */
export const KibanaPageTemplateSolutionNavCollapseButton = ({
  className,
  collapsed,
  ...rest
}: KibanaPageTemplateSolutionNavCollapseButtonProps) => {
  const classes = classNames(
    'kbnPageTemplateSolutionNavCollapseButton',
    {
      'kbnPageTemplateSolutionNavCollapseButton-isCollapsed': collapsed,
    },
    className
  );

  return (
    <EuiButtonIcon
      className={classes}
      size="s"
      color="text"
      iconType={collapsed ? 'menuRight' : 'menuLeft'}
      aria-label={collapsed ? openLabel : collapseLabel}
      title={collapsed ? openLabel : collapseLabel}
      {...rest}
    />
  );
};
