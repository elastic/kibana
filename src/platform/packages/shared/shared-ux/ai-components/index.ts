/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { AiButtonDefault } from './ai_button/src/ai_button_default';
// Backwards compat: "base" wrapper was renamed to "default".
export { AiButtonDefault as AiButtonBase } from './ai_button/src/ai_button_default';
export { AiButton } from './ai_button/src/ai_button';
export type { AiButtonProps } from './ai_button/src/ai_button';
export { AiButtonAccent } from './ai_button/src/ai_button_accent';
export { AiButtonEmpty } from './ai_button/src/ai_button_empty';
export { AiButtonIcon } from './ai_button/src/ai_button_icon';
export type { AiButtonVariant } from './ai_button/src/ai_button_base';
