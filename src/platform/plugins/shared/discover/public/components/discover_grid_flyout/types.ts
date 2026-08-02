/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import type { MouseEventHandler } from 'react';

export interface FlyoutActionItem {
  id: string;
  /** Whether the action applies at all. Actions that do not are left out entirely. */
  enabled: boolean;
  /** Whether the action applies but cannot be used right now. Explain why in `helpText`. */
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
  helpText?: string;
  iconType: IconType;
  onClick: (() => void) | MouseEventHandler;
  href?: string;
  dataTestSubj?: string;
}
