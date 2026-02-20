/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { AiButtonBase } from './ai_button_base';
import type { AiButtonProps } from './types';

/** Props for the default text AI button variants (`base` and `accent`). */
export type AiButtonDefaultProps = Extract<
  AiButtonProps,
  { iconOnly?: false; variant?: 'accent' | 'base' }
>;

/**
 * Renders the default text AI button variants (`base` and `accent`).
 * @param props - Props accepted by the default AI button variant.
 */
export const AiButtonDefault = (props: AiButtonDefaultProps) => {
  return <AiButtonBase {...props} />;
};
