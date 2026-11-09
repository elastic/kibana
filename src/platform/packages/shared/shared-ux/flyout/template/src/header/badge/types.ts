/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { DistributiveOmit } from '@elastic/eui';
import type { FlyoutHeaderBadgeProps } from '../../types';

/**
 * Descriptor produced by resolving a `Header.Badge` part; the part's children become `label`.
 * `DistributiveOmit` keeps the `EuiBadgeProps` union intact (a plain `Omit` would collapse it).
 */
export type HeaderBadgeDescriptor = DistributiveOmit<FlyoutHeaderBadgeProps, 'children' | 'id'> & {
  label: ReactNode;
};
