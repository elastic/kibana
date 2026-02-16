/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiButtonEmptyProps } from '@elastic/eui';

import { AiButtonInternal } from './ai_button_internal';

export type AiButtonEmptyProps = EuiButtonEmptyProps & {
  children: React.ReactNode;
  iconType?: EuiButtonEmptyProps['iconType'] | 'aiLogo';
};

export const AiButtonEmpty = (props: AiButtonEmptyProps) => {
  return <AiButtonInternal {...props} variant="empty" />;
};
