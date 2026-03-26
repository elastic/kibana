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
import { EuiIcon, type EuiIconProps, type IconSize } from '@elastic/eui';

import { SvgAiGradientDefs } from '../../gradient_styles/svg_ai_gradient_defs';
import { useSvgAiGradient } from '../../gradient_styles/use_ai_gradient_styles';

const aiIconWrapperCss = css({
  display: 'inline-flex',
  alignItems: 'center',
  lineHeight: 0,
  position: 'relative',
});

export interface AiIconProps extends EuiIconProps {
  type: 'aiAssistantLogo' | 'sparkles' | 'productAgent';
  size?: IconSize;
}

/** Renders an AI icon with a gradient fill using EUI semantic colors. */
export const AiIcon = ({ type, size, css: userCss, ...rest }: AiIconProps) => {
  const { gradientId, iconGradientCss, colors } = useSvgAiGradient();

  return (
    <span css={[aiIconWrapperCss, iconGradientCss]}>
      <SvgAiGradientDefs gradientId={gradientId} colors={colors} />
      <EuiIcon {...rest} type={type} size={size} css={userCss} />
    </span>
  );
};
