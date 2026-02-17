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
import { EuiButton, EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';

import { useAiButtonGradientStyles, useSvgAiGradient } from './use_ai_gradient_styles';
import { SvgAiGradientDefs } from './svg_ai_gradient_defs';
import { AiAssistantLogo } from './ai_assistant_logo';

export type AiButtonVariant = 'accent' | 'base' | 'empty' | 'outlined';

type AiButtonIconType = 'sparkles' | 'productAgent' | 'aiAssistantLogo';

type AiButtonTextProps = DistributiveOmit<
  React.ComponentProps<typeof EuiButton>,
  'fill' | 'iconType' | 'disabled'
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
};

type AiButtonEmptyProps = DistributiveOmit<
  React.ComponentProps<typeof EuiButtonEmpty>,
  'iconType' | 'disabled'
> & {
  iconOnly?: false;
  variant: 'empty' | 'outlined';
  iconType?: AiButtonIconType;
};

type AiButtonIconOnlyProps = DistributiveOmit<
  React.ComponentProps<typeof EuiButtonIcon>,
  'display' | 'iconType' | 'disabled'
> & {
  iconOnly: true;
  display?: never;
  variant?: AiButtonVariant;
  iconType: AiButtonIconType;
  'aria-label': string;
};

export type AiButtonBaseProps = AiButtonTextProps | AiButtonEmptyProps | AiButtonIconOnlyProps;

const getSyncedIconSize = (size?: string): 's' | 'm' => (size === 'm' ? 'm' : 's');

export const AiButtonBase = (props: AiButtonBaseProps) => {
  const variant: AiButtonVariant = props.variant ?? 'base';
  const isFilled = variant === 'accent';

  const { buttonCss, labelCss } = useAiButtonGradientStyles({
    isFilled,
    variant,
  });
  const { gradientId, iconGradientCss, stops } = useSvgAiGradient({
    isFilled,
    variant,
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
    const { iconType, css: userCss, display: _display, ...rest } = props;

    return (
      <>
        {svgGradientDefs}
        <EuiButtonIcon
          {...rest}
          css={[buttonCss, iconGradientCss, userCss]}
          iconSize={rest.iconSize ?? getSyncedIconSize(rest.size)}
          iconType={
            resolvedIconType(iconType) as React.ComponentProps<typeof EuiButtonIcon>['iconType']
          }
        />
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
          iconSize={euiButtonEmptyProps.iconSize ?? getSyncedIconSize(euiButtonEmptyProps.size)}
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
    'fill' | 'iconType' | 'disabled'
  >;

  return (
    <>
      {svgGradientDefs}
      <EuiButton
        {...euiButtonPropsForEui}
        iconSize={euiButtonPropsForEui.iconSize ?? getSyncedIconSize(euiButtonPropsForEui.size)}
        iconType={resolvedIconType(iconType) as React.ComponentProps<typeof EuiButton>['iconType']}
        css={[buttonCss, iconGradientCss, buttonUserCss]}
        fill={variant === 'accent'}
      >
        <span css={labelCss}>{children}</span>
      </EuiButton>
    </>
  );
};
