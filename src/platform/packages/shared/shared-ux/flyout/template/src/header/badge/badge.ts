/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlyoutHeaderBadgeProps } from '../../types';
import { badgePart } from './part';

/** Declarative `FlyoutTemplate.Header.Badge`. */
export const Badge = badgePart.createComponent<FlyoutHeaderBadgeProps>({
  resolve: ({ children, color, iconType, iconSide, 'data-test-subj': dataTestSubj }) => ({
    label: children,
    color,
    iconType,
    iconSide,
    'data-test-subj': dataTestSubj,
  }),
});

Badge.displayName = 'FlyoutTemplate.Header.Badge';
