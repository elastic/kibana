/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DebugSource, ReactFiberNode } from './types';

/**
 * Where the JSX that created the fiber was written, `null` for compiled dependencies.
 * The only place that reads `_debugSource`, which React 19 drops (see the README).
 */
export const getDebugSource = (fiber: ReactFiberNode): DebugSource | null =>
  fiber._debugSource ?? null;
