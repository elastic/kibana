/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { footerAssembly } from '../../assembly';

/** Part name for the primary (right-aligned, filled) footer action. */
export const PRIMARY_ACTION_PART_NAME = 'primaryAction';
/** Part name for the secondary (empty, left-of-primary) footer action. */
export const SECONDARY_ACTION_PART_NAME = 'secondaryAction';

export const primaryActionPart = footerAssembly.definePart({ name: PRIMARY_ACTION_PART_NAME });
export const secondaryActionPart = footerAssembly.definePart({ name: SECONDARY_ACTION_PART_NAME });
