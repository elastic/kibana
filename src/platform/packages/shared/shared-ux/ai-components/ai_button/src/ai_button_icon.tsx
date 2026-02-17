/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DistributiveOmit } from '@elastic/eui';

import { AiButtonBase, type AiButtonBaseProps } from './ai_button_base';

export type AiButtonIconProps = DistributiveOmit<
  Extract<AiButtonBaseProps, { iconOnly: true }>,
  'iconOnly'
>;

export const AiButtonIcon = (props: AiButtonIconProps) => {
  const { variant = 'base', ...rest } = props;
  return <AiButtonBase {...rest} iconOnly variant={variant} />;
};
