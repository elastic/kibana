/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { upperFirst, isFunction, omit } from 'lodash';

import { css } from '@emotion/react';
import type { MouseEvent } from 'react';
import React from 'react';

import type { EuiButtonColor, EuiButtonProps } from '@elastic/eui';
import {
  EuiToolTip,
  EuiButton,
  EuiHeaderLink,
  EuiBetaBadge,
  EuiButtonIcon,
  useEuiTheme,
} from '@elastic/eui';
import { getRouterLinkProps } from '@kbn/router-utils';
import type { SplitButtonProps } from '@kbn/split-button';
import { SplitButton } from '@kbn/split-button';
import type { TopNavMenuData } from './top_nav_menu_data';

/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export interface TopNavMenuItemProps extends TopNavMenuData {
  closePopover: () => void;
  isMobileMenu?: boolean;
}

/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export function TopNavMenuItem(props: TopNavMenuItemProps) {
  function isDisabled(): boolean {
    const val = isFunction(props.disableButton) ? props.disableButton() : props.disableButton;
    return val!;
  }

  function getTooltip(): string {
    const val = isFunction(props.tooltip) ? props.tooltip() : props.tooltip;
    return val!;
  }

  function ButtonContainer() {
    const { euiTheme } = useEuiTheme();
    if (props.badge) {
      return (
        <>
          <EuiBetaBadge
            css={css`
              margin-right: ${euiTheme.size.s};
              vertical-align: middle;

              button:hover &,
              button:focus & {
                text-decoration: underline;
              }
              button:hover & {
                cursor: pointer;
              }
            `}
            {...props.badge}
            size="s"
          />
          {upperFirst(props.label || props.id!)}
        </>
      );
    } else {
      return upperFirst(props.label || props.id!);
    }
  }

  function handleClick(event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
    if (isDisabled()) return;

    props.run(event.currentTarget);
    if (props.isMobileMenu) {
      props.closePopover();
    }
  }

  function handleSecondaryButtonClick(event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
    if (props.splitButtonProps?.isSecondaryButtonDisabled) return;

    props.splitButtonProps?.run?.(event.currentTarget);
    if (props.isMobileMenu) {
      props.closePopover();
    }
  }

  const routerLinkProps = props.href
    ? getRouterLinkProps({ href: props.href, onClick: handleClick })
    : { onClick: handleClick };

  const commonButtonProps: Partial<EuiButtonProps> & { id?: string } = {
    id: props.htmlId,
    isDisabled: isDisabled(),
    isLoading: props.isLoading,
    iconType: props.iconType,
    iconSide: props.iconSide,
    'data-test-subj': props.testId,
    className: props.className,
    color: (props.color ?? 'primary') as EuiButtonColor,
    ...routerLinkProps,
  };

  // If the item specified a href, then override the suppress the onClick
  // and make it become a regular link
  const overrideProps =
    props.target && props.href
      ? { onClick: undefined, href: props.href, target: props.target }
      : {};

  const showFragment = props.disableButton || props.tooltip;

  const btn = props.splitButtonProps ? (
    <SplitButton
      {...commonButtonProps}
      fill={props.emphasize}
      {...(omit(props.splitButtonProps, 'run') as SplitButtonProps)}
      onSecondaryButtonClick={handleSecondaryButtonClick}
      size="s"
    >
      <ButtonContainer />
    </SplitButton>
  ) : props.iconOnly && props.iconType && !props.isMobileMenu ? (
    // icon only buttons are not supported by EuiHeaderLink
    React.createElement(
      showFragment ? React.Fragment : EuiToolTip,
      // @ts-expect-error - EuiToolTip does not accept `key` prop, we pass to react Fragment
      {
        ...(showFragment
          ? { key: props.label || props.id! }
          : {
              content: upperFirst(props.label || props.id!),
              position: 'bottom',
              delay: 'long',
            }),
      },
      <EuiButtonIcon
        size="s"
        {...omit(commonButtonProps, 'iconSide')}
        iconType={props.iconType}
        display={props.emphasize && (props.fill ?? true) ? 'fill' : undefined}
        aria-label={upperFirst(props.label || props.id!)}
      />
    )
  ) : props.emphasize ? (
    // fill is not compatible with EuiHeaderLink
    <EuiButton
      size="s"
      fullWidth={props.isMobileMenu}
      {...commonButtonProps}
      fill={props.fill ?? true}
    >
      <ButtonContainer />
    </EuiButton>
  ) : (
    <EuiHeaderLink size="s" {...commonButtonProps} {...overrideProps}>
      <ButtonContainer />
    </EuiHeaderLink>
  );

  const tooltip = getTooltip();
  if (tooltip) {
    return (
      <EuiToolTip title={props.tooltipTitle} content={tooltip}>
        {btn}
      </EuiToolTip>
    );
  }
  return btn;
}

TopNavMenuItem.defaultProps = {
  disableButton: false,
  tooltip: '',
};
