/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { upperFirst, isFunction, omit } from 'lodash';
import React, { MouseEvent } from 'react';
import {
  EuiToolTip,
  EuiButton,
  EuiHeaderLink,
  EuiBetaBadge,
  EuiButtonColor,
  EuiButtonIcon,
} from '@elastic/eui';
import { TopNavMenuData } from './top_nav_menu_data';

export function TopNavMenuItem(props: TopNavMenuData & { isMobileMenu?: boolean }) {
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
    color: (props.color ?? 'primary') as EuiButtonColor,
  };

  // If the item specified a href, then override the suppress the onClick
  // and make it become a regular link
  const overrideProps =
    props.target && props.href
      ? { onClick: undefined, href: props.href, target: props.target }
      : {};

  const btn =
    props.iconOnly && props.iconType && !props.isMobileMenu ? (
      // icon only buttons are not supported by EuiHeaderLink
      <EuiToolTip content={upperFirst(props.label || props.id!)} position="bottom" delay="long">
        <EuiButtonIcon
          size="s"
          {...omit(commonButtonProps, 'iconSide')}
          iconType={props.iconType}
          display={props.emphasize && (props.fill ?? true) ? 'fill' : undefined}
          aria-label={upperFirst(props.label || props.id!)}
        />
      </EuiToolTip>
    ) : props.emphasize ? (
      // fill is not compatible with EuiHeaderLink
      <EuiButton
        size="s"
        fullWidth={props.isMobileMenu}
        {...commonButtonProps}
        fill={props.fill ?? true}
      >
        {getButtonContainer()}
      </EuiButton>
    ) : (
      <EuiHeaderLink size="s" {...commonButtonProps} {...overrideProps}>
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
