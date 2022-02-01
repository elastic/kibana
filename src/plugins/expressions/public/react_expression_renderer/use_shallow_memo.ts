/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line @typescript-eslint/triple-slash-reference, spaced-comment
/// <reference path="./shallow_equal.d.ts" />

import { useRef } from 'react';
import shallowEqual from 'react-redux/lib/utils/shallowEqual';

export function useShallowMemo<T>(value: T): T {
  const previousRef = useRef(value);

  if (!shallowEqual(previousRef.current, value)) {
    previousRef.current = value;
  }

  return previousRef.current;
}
