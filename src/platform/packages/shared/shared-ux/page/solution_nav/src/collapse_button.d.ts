/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { EuiButtonIconPropsForButton } from '@elastic/eui';
export type SolutionNavCollapseButtonProps = Partial<EuiButtonIconPropsForButton> & {
  /**
   * Boolean state of current collapsed status
   */
  isCollapsed: boolean;
};
/**
 * Creates the styled icon button for showing/hiding solution nav
 */
export declare const SolutionNavCollapseButton: ({
  className,
  isCollapsed,
  ...rest
}: SolutionNavCollapseButtonProps) => React.JSX.Element;
