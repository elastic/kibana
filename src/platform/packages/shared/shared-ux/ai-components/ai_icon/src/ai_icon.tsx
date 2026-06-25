/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import { EuiIcon, type EuiIconProps, type IconSize } from '@elastic/eui';

import type { AiButtonIconType } from '../../ai_button/src/types';
import { AiAssistantLogo } from '../../ai_icons/ai_assistant_logo';
import { SvgAiGradientDefs } from '../../gradient_styles/svg_ai_gradient_defs';
import { useSvgAiGradient } from '../../gradient_styles/use_ai_gradient_styles';

const aiIconWrapperCss = css({
  display: 'inline-flex',
  alignItems: 'center',
  lineHeight: 0,
  position: 'relative',
});

export interface AiIconProps extends Omit<EuiIconProps, 'type'> {
  iconType: AiButtonIconType;
  size?: IconSize;
}
const resolvedIconType = (iconType: AiButtonIconType): IconType =>
  iconType === 'aiAssistantLogo' ? AiAssistantLogo : iconType;

/** Renders an AI icon with a gradient fill */
export const AiIcon = ({ iconType, size, css: userCss, ...rest }: AiIconProps) => {
  const { gradientId, iconGradientCss, colors } = useSvgAiGradient({ variant: 'base' });

  return (
    <span css={[aiIconWrapperCss, iconGradientCss]}>
      <SvgAiGradientDefs gradientId={gradientId} colors={colors} />
      <EuiIcon {...rest} type={resolvedIconType(iconType)} size={size} css={userCss} />
    </span>
  );
};
