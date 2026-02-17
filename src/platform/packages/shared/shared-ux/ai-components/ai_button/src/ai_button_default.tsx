/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { AiButtonBase, type AiButtonBaseProps } from './ai_button_base';

export type AiButtonDefaultProps = Extract<
  AiButtonBaseProps,
  { iconOnly?: false; variant?: 'accent' | 'base' }
>;

export const AiButtonDefault = (props: AiButtonDefaultProps) => {
  const { variant = 'base', ...rest } = props;
  return <AiButtonBase {...rest} variant={variant} />;
};
