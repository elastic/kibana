/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetaBlock } from '@kbn/flyout-meta-blocks';
import { headerAssembly } from '../../assembly';

/** Part name used for identifying `Header.MetaBlock` children. */
export const META_BLOCK_PART_NAME = 'metaBlock';

/** Part factory for `FlyoutTemplate.Header.MetaBlock`. Resolves to a `MetaBlock`. */
export const metaBlockPart = headerAssembly.definePart<Record<string, never>, MetaBlock, void>({
  name: META_BLOCK_PART_NAME,
});
