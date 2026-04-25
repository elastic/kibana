/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiFlyoutProps } from '@elastic/eui';

export interface FlyoutConfig {
  title: string;
  flyoutType: 'overlay' | 'push';
  size: 's' | 'm' | 'l' | 'fill';
  maxWidth?: number;
  isChild?: boolean;
  useConditionalRendering?: boolean;
}

/**
 * Creates common flyout props for main flyouts
 */
export const createMainFlyoutProps = (config: FlyoutConfig): Partial<EuiFlyoutProps> => {
  const { title, flyoutType, size, maxWidth, useConditionalRendering } = config;

  return {
    id: `mainFlyout-${title}`,
    session: 'start',
    flyoutMenuProps: {
      title: `${title} - Main${useConditionalRendering ? ' (without isOpen)' : ''}`,
    },
    'aria-labelledby': 'flyoutTitle',
    size,
    maxWidth,
    type: flyoutType,
    ownFocus: false,
    pushAnimation: true,
  };
};

/**
 * Creates common flyout props for child flyouts
 */
export const createChildFlyoutProps = (config: FlyoutConfig): Partial<EuiFlyoutProps> => {
  const { title, size, maxWidth, useConditionalRendering } = config;

  return {
    id: `childFlyout-${title}`,
    flyoutMenuProps: {
      title: `${title} - Child${useConditionalRendering ? ' (without isOpen)' : ''}`,
    },
    'aria-labelledby': 'childFlyoutTitle',
    size,
    maxWidth,
  };
};
