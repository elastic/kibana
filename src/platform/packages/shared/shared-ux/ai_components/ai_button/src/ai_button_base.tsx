/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiButtonIconProps } from '@elastic/eui';
import { EuiButton, EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';

import { useAiButtonGradientStyles, useSvgAiGradient } from './use_ai_gradient_styles';
import { SvgAiGradientDefs } from './svg_ai_gradient_defs';

type AiButtonVariant = 'primary' | 'secondary' | 'empty';

type AiClassicButtonProps = React.ComponentProps<typeof EuiButton> & {
  iconOnly?: false;
  fill?: never;
  variant: Exclude<AiButtonVariant, 'empty'>;
  children: React.ReactNode;
};

type AiButtonEmptyProps = React.ComponentProps<typeof EuiButtonEmpty> & {
  iconOnly?: false;
  variant: 'empty';
  children: React.ReactNode;
};

type AiButtonIconOnlyProps = React.ComponentProps<typeof EuiButtonIcon> & {
  iconOnly: true;
  display?: never;
  children?: never;
  variant: AiButtonVariant;
  'aria-label': string;
};

export type AiButtonBaseProps = AiClassicButtonProps | AiButtonEmptyProps | AiButtonIconOnlyProps;

const ICON_DISPLAY_MAP: Record<AiButtonVariant, NonNullable<EuiButtonIconProps['display']>> = {
  empty: 'empty',
  primary: 'fill',
  secondary: 'base',
};

export const AiButtonBase: React.FC<AiButtonBaseProps> = (props) => {
  const isFilled = props.variant === 'primary';
  const { buttonCss, labelCss } = useAiButtonGradientStyles({
    fill: isFilled,
    variant: props.variant,
  });
  const { gradientId, iconGradientCss, stops } = useSvgAiGradient({
    isFilled,
    variant: props.variant,
  });
  const svgGradientDefs = iconGradientCss ? (
    <SvgAiGradientDefs
      gradientId={gradientId}
      startColor={stops.startColor}
      endColor={stops.endColor}
      startOffsetPercent={stops.startOffsetPercent}
      endOffsetPercent={stops.endOffsetPercent}
    />
  ) : null;

  if (props.iconOnly) {
    const {
      iconOnly: _iconOnly,
      variant,
      iconType,
      display: _display,
      children: _children,
      css: userCss,
      ...rest
    } = props;
    const computedDisplay = ICON_DISPLAY_MAP[variant];

    return (
      <>
        {svgGradientDefs}
        <EuiButtonIcon
          {...rest}
          css={[buttonCss, iconGradientCss, userCss]}
          display={computedDisplay}
          iconType={iconType}
        />
      </>
    );
  }

  if (props.variant === 'empty') {
    const { children, css: buttonEmptyCss, ...euiButtonEmptyProps } = props;

    return (
      <>
        {svgGradientDefs}
        <EuiButtonEmpty {...euiButtonEmptyProps} css={[buttonCss, iconGradientCss, buttonEmptyCss]}>
          <span css={labelCss}>{children}</span>
        </EuiButtonEmpty>
      </>
    );
  }

  const { variant, children, fill: _fill, css: buttonUserCss, ...euiButtonProps } = props;

  return (
    <>
      {svgGradientDefs}
      <EuiButton
        {...euiButtonProps}
        css={[buttonCss, iconGradientCss, buttonUserCss]}
        fill={variant === 'primary'}
      >
        <span css={labelCss}>{children}</span>
      </EuiButton>
    </>
  );
};
