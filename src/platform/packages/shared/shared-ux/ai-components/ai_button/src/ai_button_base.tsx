/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DistributiveOmit, IconType } from '@elastic/eui';
import { EuiButton, EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';

import { useAiButtonGradientStyles, useSvgAiGradient } from './use_ai_gradient_styles';
import { SvgAiGradientDefs } from './svg_ai_gradient_defs';
import { AiAssistantLogo } from './ai_assistant_logo';

export type AiButtonVariant = 'accent' | 'base' | 'empty' | 'outlined';

type AiButtonIconType = 'sparkles' | 'productAgent' | 'aiAssistantLogo';

type EuiButtonBaseProps = DistributiveOmit<
  React.ComponentProps<typeof EuiButton>,
  'fill' | 'iconType' | 'disabled'
>;

type AiButtonTextProps = EuiButtonBaseProps & {
  /** Selects text button vs icon-only button rendering. */
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

  const resolvedIconType = (iconType: AiButtonIconType): IconType =>
    iconType === 'aiAssistantLogo' ? AiAssistantLogo : iconType;

  if (props.iconOnly === true) {
    const {
      iconType,
      css: userCss,
      display: _display,
      iconOnly: _iconOnly,
      variant: _variant,
      ...euiIconProps
    } = props;

    return (
      <>
        {svgGradientDefs}
        <EuiButtonIcon
          {...euiIconProps}
          css={[buttonCss, iconGradientCss, userCss]}
          iconSize={euiIconProps.iconSize ?? getSyncedIconSize(euiIconProps.size)}
          iconType={resolvedIconType(iconType)}
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
          iconType={iconType ? resolvedIconType(iconType) : undefined}
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

  return (
    <>
      {svgGradientDefs}
      <EuiButton
        {...(euiButtonProps as EuiButtonBaseProps)}
        iconSize={euiButtonProps.iconSize ?? getSyncedIconSize(euiButtonProps.size)}
        iconType={iconType ? resolvedIconType(iconType) : undefined}
        css={[buttonCss, iconGradientCss, buttonUserCss]}
        fill={variant === 'accent'}
      >
        <span css={labelCss}>{children}</span>
      </EuiButton>
    </>
  );
};
