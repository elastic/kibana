/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { InstructionType } from '../../../services/tutorials/types';
export interface InstructionProps extends InstructionType {
  variantId: string;
  isCloudEnabled: boolean;
  replaceTemplateStrings: (text: string) => string;
}
export declare function Instruction({
  commands,
  textPost,
  textPre,
  replaceTemplateStrings,
  customComponentName,
  variantId,
  isCloudEnabled,
}: InstructionProps): React.JSX.Element;
