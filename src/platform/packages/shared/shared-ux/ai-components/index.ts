/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { AiButton, type AiButtonProps } from './ai_button/src/ai_button';
export { AiButtonDefault, type AiButtonDefaultProps } from './ai_button/src/ai_button_default';
export { AiButtonEmpty, type AiButtonEmptyProps } from './ai_button/src/ai_button_empty';
export { AiButtonIcon, type AiButtonIconProps } from './ai_button/src/ai_button_icon';
export { AiIcon, type AiIconProps } from './ai_icon/src/ai_icon';

export type { AiButtonIconType, AiButtonVariant } from './ai_button/src/types';

export {
  useAiButtonGradientStyles,
  useSvgAiGradient,
  type AiButtonGradientOptions,
  type AiButtonGradientStyles,
  type AiGradientColors,
  type SvgAiGradient,
} from './gradient_styles/use_ai_gradient_styles';
export {
  SvgAiGradientDefs,
  type SvgAiGradientDefsProps,
} from './gradient_styles/svg_ai_gradient_defs';
