/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { EuiButtonIconPropsForButton, EuiButtonProps } from '@elastic/eui';

import { useAiButtonGradientStyles, useSvgAiGradient } from './use_ai_gradient_styles';
import { SvgAiGradientDefs } from './svg_ai_gradient_defs';

export type AiButtonVariant = 'accent' | 'base' | 'empty';

// TODO: Temporary icon for the AI logo. When it becomes available in EUI, switch to it.
const AiLogoIcon = (svgProps: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    viewBox="0 0 16 16"
    fill="none"
    {...svgProps}
  >
    <path d="M9 7H15V16H9V7Z" fill="currentColor" />
    <path
      d="M1 11.5C1 9.01472 3.01472 7 5.5 7H7V16H5.5C3.01472 16 1 13.9853 1 11.5Z"
      fill="currentColor"
    />
    <path
      d="M15 3C15 4.65685 13.6569 6 12 6C10.3431 6 9 4.65685 9 3C9 1.34315 10.3431 0 12 0C13.6569 0 15 1.34315 15 3Z"
      fill="currentColor"
    />
    <path d="M1.5 5.75C1.5 2.71243 3.96243 0.25 7 0.25V5.75H1.5Z" fill="currentColor" />
  </svg>
);

type AiButtonProps = Omit<EuiButtonProps, 'fill' | 'iconType'> & {
  iconOnly?: false;
  fill?: never;
  variant: Exclude<AiButtonVariant, 'empty'>;
  iconType?: EuiButtonProps['iconType'] | 'aiLogo';
};

type AiButtonEmptyProps = React.ComponentProps<typeof EuiButtonEmpty> & {
  iconOnly?: false;
  variant: 'empty';
  iconType?: React.ComponentProps<typeof EuiButtonEmpty>['iconType'] | 'aiLogo';
  children: React.ReactNode;
};

type AiButtonIconOnlyProps = EuiButtonIconPropsForButton & {
  iconOnly: true;
  display?: never;
  children?: never;
  variant: AiButtonVariant;
  appName?: string;
  iconType: EuiButtonIconPropsForButton['iconType'] | 'aiLogo';
  'aria-label': string;
};

export type AiButtonInternalProps = AiButtonProps | AiButtonEmptyProps | AiButtonIconOnlyProps;

export const AiButtonInternal = (props: AiButtonInternalProps) => {
  const isFilled = props.variant === 'accent';

  const { buttonCss, labelCss } = useAiButtonGradientStyles({
    fill: isFilled,
    variant: props.variant,
  });
  const { gradientId, iconGradientCss, stops } = useSvgAiGradient({
    isFilled,
    variant: props.variant,
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

  const resolvedIconType = (iconType: unknown) => (iconType === 'aiLogo' ? AiLogoIcon : iconType);

  if (props.iconOnly) {
    const {
      variant,
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
        display={variant === 'accent' ? 'fill' : variant}
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

  if (props.variant === 'empty') {
    const { children, css: buttonEmptyCss, iconType, ...euiButtonEmptyProps } = props;

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

  const { variant, children, fill: _fill, css: buttonUserCss, iconType, ...euiButtonProps } = props;

  return (
    <>
      {svgGradientDefs}
      <EuiButton
        {...euiButtonProps}
        iconType={resolvedIconType(iconType) as React.ComponentProps<typeof EuiButton>['iconType']}
        css={[buttonCss, iconGradientCss, buttonUserCss]}
        fill={variant === 'accent'}
      >
        <span css={labelCss}>{children}</span>
      </EuiButton>
    </>
  );
};
