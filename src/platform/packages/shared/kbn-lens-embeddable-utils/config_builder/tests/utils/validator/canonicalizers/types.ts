/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensAttributes } from '../../../../types';

/**
 * This function canonicalizes lens attributes before and after a transform.
 *
 * In some cases things like ids, accessors and defaults are different or missing.
 * This function converts the initial attributes to allow comparing with output attributes.
 */
export type Canonicalizer<T extends LensAttributes> = (state: T) => T;
