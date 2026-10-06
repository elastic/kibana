/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
/**
 * Formats an array value as React nodes with bracket/comma notation.
 *
 * Single-element and empty arrays are passed through without brackets.
 *
 * This should be applied at the call site (e.g. inside convertToReact)
 * rather than inside individual formatter's reactConvert, so that formatters which
 * override reactConvert get correct array rendering for free.
 */
export declare function formatReactArray(
  val: unknown[],
  convertSingle: (v: unknown) => ReactNode
): ReactNode;
