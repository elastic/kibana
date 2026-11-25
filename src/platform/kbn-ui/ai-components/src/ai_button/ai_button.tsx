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

export type { AiButtonProps } from './types';

/**
 * Renders the AI button with variant-based styling and icon behavior.
 * @param props - AI button configuration.
 */
export const AiButton = (props: AiButtonProps) => {
  return <AiButtonBase {...props} />;
};
