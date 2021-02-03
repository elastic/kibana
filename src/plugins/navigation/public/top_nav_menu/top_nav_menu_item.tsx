/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { upperFirst, isFunction } from 'lodash';
import React, { MouseEvent } from 'react';
import { EuiToolTip, EuiButton, EuiHeaderLink } from '@elastic/eui';
import { TopNavMenuData } from './top_nav_menu_data';

export function TopNavMenuItem(props: TopNavMenuData) {
  function isDisabled(): boolean {
    const val = isFunction(props.disableButton) ? props.disableButton() : props.disableButton;
    return val!;
  }

  function getTooltip(): string {
    const val = isFunction(props.tooltip) ? props.tooltip() : props.tooltip;
    return val!;
  }

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (isDisabled()) return;
    props.run(e.currentTarget);
  }

  const commonButtonProps = {
    isDisabled: isDisabled(),
    onClick: handleClick,
    iconType: props.iconType,
    iconSide: props.iconSide,
    'data-test-subj': props.testId,
    className: props.className,
  };

  const btn = props.emphasize ? (
    <EuiButton size="s" {...commonButtonProps}>
      {upperFirst(props.label || props.id!)}
    </EuiButton>
  ) : (
    <EuiHeaderLink size="xs" color="primary" {...commonButtonProps}>
      {upperFirst(props.label || props.id!)}
    </EuiHeaderLink>
  );

  const tooltip = getTooltip();
  if (tooltip) {
    return <EuiToolTip content={tooltip}>{btn}</EuiToolTip>;
  }
  return btn;
}

TopNavMenuItem.defaultProps = {
  disableButton: false,
  tooltip: '',
};
