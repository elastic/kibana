/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, memo, ReactElement } from 'react';

/**
 * A `React.memo` variant that keeps generic type information
 */
export const typedMemo: <T>(c: T) => T = memo;

/**
 * A `React.forwardRef` variant that keeps generic type information
 */
export function typedForwardRef<T, P = {}>(
  render: (props: P, ref: React.Ref<T>) => ReactElement
): (props: P & React.RefAttributes<T>) => ReactElement {
  return forwardRef(render) as any;
}
