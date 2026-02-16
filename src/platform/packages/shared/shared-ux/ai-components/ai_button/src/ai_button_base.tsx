/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DistributiveOmit } from '@elastic/eui';
import { EuiButton, EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { useAiButtonGradientStyles, useSvgAiGradient } from './use_ai_gradient_styles';
import { SvgAiGradientDefs } from './svg_ai_gradient_defs';
import { AiAssistantLogo } from './ai_assistant_logo';

export type AiButtonVariant = 'accent' | 'base' | 'empty' | 'outlined';

type AiButtonIconType = 'sparkles' | 'productAgent' | 'aiAssistantLogo';

type AiButtonTextProps = DistributiveOmit<
  React.ComponentProps<typeof EuiButton>,
  'children' | 'fill' | 'iconType' | 'disabled'
> & {
  /**
   * Controls which underlying button visual is used.
   * - `false`/unset: renders a text button (EuiButton/EuiButtonEmpty depending on `variant`)
   * - `true`: renders an icon-only button (EuiButtonIcon)
   */
  iconOnly?: false;
  fill?: never;
  variant?: 'base' | 'accent';
  iconType?: AiButtonIconType;
  children: React.ReactNode;
};

type AiButtonEmptyProps = DistributiveOmit<
  React.ComponentProps<typeof EuiButtonEmpty>,
  'children' | 'iconType' | 'disabled'
> & {
  iconOnly?: false;
  variant: 'empty' | 'outlined';
  iconType?: AiButtonIconType;
  children: React.ReactNode;
};

type AiButtonIconOnlyProps = DistributiveOmit<
  React.ComponentProps<typeof EuiButtonIcon>,
  'children' | 'display' | 'iconType' | 'disabled'
> & {
  iconOnly: true;
  display?: never;
  children?: never;
  variant?: AiButtonVariant;
  appName?: string;
  iconType: AiButtonIconType;
  'aria-label': string;
};

export type AiButtonBaseProps = AiButtonTextProps | AiButtonEmptyProps | AiButtonIconOnlyProps;

export const AiButtonBase = (props: AiButtonBaseProps) => {
  const resolvedVariant: AiButtonVariant = props.variant ?? 'base';
  const isFilled = resolvedVariant === 'accent';

  const { buttonCss, labelCss } = useAiButtonGradientStyles({
    fill: isFilled,
    variant: resolvedVariant,
  });
  const { gradientId, iconGradientCss, stops } = useSvgAiGradient({
    isFilled,
    variant: resolvedVariant,
  });

  // Render local SVG <defs> so icon paths can reference url(#gradientId).
  // Defs are rendered before each button/icon to guarantee the id exists in the same DOM tree.
  const svgGradientDefs = iconGradientCss ? (
    <SvgAiGradientDefs
      gradientId={gradientId}
      startColor={stops.startColor}
      endColor={stops.endColor}
      startOffsetPercent={stops.startOffsetPercent}
      endOffsetPercent={stops.endOffsetPercent}
    />
  ) : null;

  const resolvedIconType = (iconType?: AiButtonIconType) =>
    iconType === 'aiAssistantLogo' ? AiAssistantLogo : iconType;

  if (props.iconOnly === true) {
    const {
      iconType,
      css: userCss,
      iconOnly: _iconOnly,
      display: _display,
      children: _children,
      appName,
      ...rest
    } = props;

    const buttonIcon = (
      <EuiButtonIcon
        {...rest}
        css={[buttonCss, iconGradientCss, userCss]}
        display={
          resolvedVariant === 'accent'
            ? 'fill'
            : resolvedVariant === 'outlined'
            ? 'empty'
            : resolvedVariant
        }
        iconType={
          resolvedIconType(iconType) as React.ComponentProps<typeof EuiButtonIcon>['iconType']
        }
      />
    );

    return (
      <>
        {svgGradientDefs}
        {appName ? <EuiToolTip content={appName}>{buttonIcon}</EuiToolTip> : buttonIcon}
      </>
    );
  }

  if (props.variant === 'empty' || props.variant === 'outlined') {
    const {
      variant: _variant,
      iconOnly: _iconOnly,
      children,
      css: buttonEmptyCss,
      iconType,
      ...euiButtonEmptyProps
    } = props;

    return (
      <>
        {svgGradientDefs}
        <EuiButtonEmpty
          {...euiButtonEmptyProps}
          iconType={
            resolvedIconType(iconType) as React.ComponentProps<typeof EuiButtonEmpty>['iconType']
          }
          css={[buttonCss, iconGradientCss, buttonEmptyCss]}
        >
          <span css={labelCss}>{children}</span>
        </EuiButtonEmpty>
      </>
    );
  }

  const {
    variant: _variant,
    iconOnly: _iconOnly,
    children,
    css: buttonUserCss,
    iconType,
    ...euiButtonProps
  } = props;

  const euiButtonPropsForEui = euiButtonProps as DistributiveOmit<
    React.ComponentProps<typeof EuiButton>,
    'children' | 'fill' | 'iconType' | 'disabled'
  >;

  return (
    <>
      {svgGradientDefs}
      <EuiButton
        {...euiButtonPropsForEui}
        iconType={resolvedIconType(iconType) as React.ComponentProps<typeof EuiButton>['iconType']}
        css={[buttonCss, iconGradientCss, buttonUserCss]}
        fill={resolvedVariant === 'accent'}
      >
        <span css={labelCss}>{children}</span>
      </EuiButton>
    </>
  );
};
