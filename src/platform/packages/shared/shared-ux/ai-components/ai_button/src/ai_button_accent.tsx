/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { AiButtonBase, type AiButtonProps } from './ai_button_base';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type AiButtonAccentProps = DistributiveOmit<
  Extract<AiButtonProps, { iconOnly?: false; variant?: 'accent' | 'base' }>,
  'variant'
>;

export const AiButtonAccent = (props: AiButtonAccentProps) => {
  return <AiButtonBase {...props} variant="accent" />;
};
