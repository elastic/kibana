/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiButtonIconPropsForButton } from '@elastic/eui';

import { AiButtonInternal, type AiButtonVariant } from './ai_button_internal';

export type AiButtonIconProps = Omit<
  EuiButtonIconPropsForButton,
  'children' | 'display' | 'iconType'
> & {
  variant?: AiButtonVariant;
  appName?: string;
  iconType: EuiButtonIconPropsForButton['iconType'] | 'aiLogo';
  'aria-label': string;
};

export const AiButtonIcon = (props: AiButtonIconProps) => {
  const { variant = 'base', ...rest } = props;
  return <AiButtonInternal {...rest} iconOnly variant={variant} />;
};
