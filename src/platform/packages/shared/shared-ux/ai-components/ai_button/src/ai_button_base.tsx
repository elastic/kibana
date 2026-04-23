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

import {
  useAiButtonGradientStyles,
  useSvgAiGradient,
} from '../../gradient_styles/use_ai_gradient_styles';
import { useAiButtonXsSizeCss } from './ai_button_xs_size_styles';
import { SvgAiGradientDefs } from '../../gradient_styles/svg_ai_gradient_defs';
import { AiAssistantLogo } from '../../ai_icons/ai_assistant_logo';
import type { AiButtonIconType, AiButtonProps, AiButtonVariant } from './types';

const resolvedIconType = (iconType: AiButtonIconType): IconType =>
  iconType === 'aiAssistantLogo' ? AiAssistantLogo : iconType;

// Per design: only xs uses small icon; s and m both use medium icon.
const getSyncedIconSize = (size?: 'xs' | 's' | 'm') => (size === 'xs' ? 's' : 'm');

/** Button-only HTML attributes to omit when rendering as anchor. */
const BUTTON_ONLY_KEYS = [
  'form',
  'formAction',
  'formEncType',
  'formMethod',
  'formNoValidate',
  'formTarget',
  'name',
  'type',
  'value',
] as const;
/** Anchor-only HTML attributes to omit when rendering as button. */
const ANCHOR_ONLY_KEYS = ['href', 'target', 'rel', 'download', 'referrerPolicy', 'ping'] as const;

/**
 * Keep only the props branch that matches `hasHref`, so spreads satisfy EUI's union.
 */
function filterForButtonOrAnchor(
  rest: Record<string, unknown>,
  hasHref: boolean
): Record<string, unknown> {
  const filtered = { ...rest };
  for (const k of hasHref ? BUTTON_ONLY_KEYS : ANCHOR_ONLY_KEYS) {
    delete filtered[k];
  }
  return filtered;
}

export const AiButtonBase = (props: AiButtonProps) => {
  const variant: AiButtonVariant = props.variant ?? 'base';

  const euiButtonXsSizeCss = useAiButtonXsSizeCss();
  const { buttonCss, labelCss } = useAiButtonGradientStyles({
    variant,
    iconOnly: props.iconOnly,
  });
  const { gradientId, iconGradientCss, colors } = useSvgAiGradient({ variant });

  const svgGradientDefs = iconGradientCss ? (
    <SvgAiGradientDefs gradientId={gradientId} colors={colors} />
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

    const filtered = filterForButtonOrAnchor(rest, !!rest.href);
    const iconProps = {
      ...filtered,
      iconType: resolvedIconType(iconType),
      iconSize: rest.iconSize ?? getSyncedIconSize(rest.size),
      css: [buttonCss, iconGradientCss, userCss],
    };

    return (
      <>
        {svgGradientDefs}
        <EuiButtonIcon {...iconProps} />
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

    const filtered = filterForButtonOrAnchor(rest, !!rest.href);
    const emptyProps = {
      ...filtered,
      iconSize: rest.iconSize ?? getSyncedIconSize(rest.size),
      iconType: iconType ? resolvedIconType(iconType) : undefined,
      css: [buttonCss, iconGradientCss, userCss],
      children: <span css={labelCss}>{children}</span>,
    };
    return (
      <>
        {svgGradientDefs}
        <EuiButtonEmpty {...emptyProps} />
      </>
    );
  }

  const {
    variant: _variant,
    iconOnly: _iconOnly,
    children,
    css: userCss,
    iconType,
    size,
    ...rest
  } = props;
  const buttonSize: 's' | 'm' | undefined = size === 'xs' ? 's' : size;

  const filtered = filterForButtonOrAnchor(rest, !!rest.href);
  const buttonProps = {
    ...filtered,
    size: buttonSize,
    iconSize: rest.iconSize ?? getSyncedIconSize(size),
    iconType: iconType ? resolvedIconType(iconType) : undefined,
    css: [buttonCss, iconGradientCss, size === 'xs' && euiButtonXsSizeCss, userCss],
    fill: variant === 'accent',
    children: <span css={labelCss}>{children}</span>,
  };

  return (
    <>
      {svgGradientDefs}
      <EuiButton {...buttonProps} />
    </>
  );
};
