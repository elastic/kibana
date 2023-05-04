/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { upperFirst, isFunction } from 'lodash';
import React, { MouseEvent } from 'react';
import { EuiToolTip, EuiButton, EuiHeaderLink, EuiBetaBadge } from '@elastic/eui';
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

  function getButtonContainer() {
    if (props.badge) {
      return (
        <>
          <EuiBetaBadge className="kbnTopNavMenu__betaBadgeItem" {...props.badge} size="s" />
          {upperFirst(props.label || props.id!)}
        </>
      );
    } else {
      return upperFirst(props.label || props.id!);
    }
  }

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (isDisabled()) return;
    props.run(e.currentTarget);
  }

  const commonButtonProps = {
    isDisabled: isDisabled(),
    onClick: handleClick,
    isLoading: props.isLoading,
    iconType: props.iconType,
    iconSide: props.iconSide,
    'data-test-subj': props.testId,
    className: props.className,
  };

  // If the item specified a href, then override the suppress the onClick
  // and make it become a regular link
  const overrideProps =
    props.target && props.href
      ? { onClick: undefined, href: props.href, target: props.target }
      : {};

  const btn = props.emphasize ? (
    <EuiButton size="s" {...commonButtonProps} fill>
      {getButtonContainer()}
    </EuiButton>
  ) : (
    <EuiHeaderLink size="s" color="primary" {...commonButtonProps} {...overrideProps}>
      {getButtonContainer()}
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
