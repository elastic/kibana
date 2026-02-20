/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import { EuiButton, EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';

import { useAiButtonGradientStyles, useSvgAiGradient } from './use_ai_gradient_styles';
import { SvgAiGradientDefs } from './svg_ai_gradient_defs';
import { AiAssistantLogo } from './ai_assistant_logo';
import type { AiButtonIconType, AiButtonProps, AiButtonVariant } from './types';

const resolvedIconType = (iconType: AiButtonIconType): IconType =>
  iconType === 'aiAssistantLogo' ? AiAssistantLogo : iconType;

const getSyncedIconSize = (size?: string): 's' | 'm' => (size === 'm' ? 'm' : 's');

export const AiButtonBase = (props: AiButtonProps) => {
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

  if (props.iconOnly === true) {
    const {
      iconType,
      css: userCss,
      display: _display,
      iconOnly: _iconOnly,
      variant: _variant,
      ...rest
    } = props;

    return (
      <>
        {svgGradientDefs}
        <EuiButtonIcon
          {...rest}
          css={[buttonCss, iconGradientCss, userCss]}
          iconSize={rest.iconSize ?? getSyncedIconSize(rest.size)}
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
      css: userCss,
      iconType,
      ...rest
    } = props;

    return (
      <>
        {svgGradientDefs}
        <EuiButtonEmpty
          {...rest}
          iconSize={rest.iconSize ?? getSyncedIconSize(rest.size)}
          iconType={iconType ? resolvedIconType(iconType) : undefined}
          css={[buttonCss, iconGradientCss, userCss]}
        >
          <span css={labelCss}>{children}</span>
        </EuiButtonEmpty>
      </>
    );
  }

  type EuiButtonBranchProps = Extract<AiButtonProps, { variant?: 'base' | 'accent' }>;
  const {
    variant: _variant,
    iconOnly: _iconOnly,
    children,
    css: userCss,
    iconType,
    ...rest
  } = props as EuiButtonBranchProps;

  return (
    <>
      {svgGradientDefs}
      <EuiButton
        {...rest}
        iconSize={rest.iconSize ?? getSyncedIconSize(rest.size)}
        iconType={iconType ? resolvedIconType(iconType) : undefined}
        css={[buttonCss, iconGradientCss, userCss]}
        fill={variant === 'accent'}
      >
        <span css={labelCss}>{children}</span>
      </EuiButton>
    </>
  );
};
