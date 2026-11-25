/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HeaderBadgeDescriptor } from './types';
import { headerAssembly } from '../../assembly';

/** Part name used for identifying `Header.Badge` children. */
export const BADGE_PART_NAME = 'badge';

/** Part factory for `FlyoutTemplate.Header.Badge`. Resolves to a `HeaderBadgeDescriptor`. */
export const badgePart = headerAssembly.definePart<
  Record<string, never>,
  HeaderBadgeDescriptor,
  void
>({
  name: BADGE_PART_NAME,
});
