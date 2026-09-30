/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfoBlockItem } from '@kbn/flyout-info-blocks';
import { headerAssembly } from '../../assembly';

/** Part name used for identifying `Header.InfoBlock` children. */
export const INFO_BLOCK_PART_NAME = 'infoBlock';

/** Part factory for `FlyoutTemplate.Header.InfoBlock`. Resolves to an `InfoBlockItem`. */
export const infoBlockPart = headerAssembly.definePart<Record<string, never>, InfoBlockItem, void>({
  name: INFO_BLOCK_PART_NAME,
});
