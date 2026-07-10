/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';

/**
 * Returns a referentially-stable version of `value`: the same object reference is
 * returned across renders as long as `getFingerprint(value)` is unchanged, even if
 * `value` itself is a brand new object/array each render.
 *
 * Useful when an upstream source (e.g. a Redux selector recomputed on every keystroke)
 * produces a fresh reference whose *content* is often unchanged — downstream
 * `useMemo`/`useEffect` hooks keyed on the stabilized value then skip recomputation
 * instead of re-running on every render.
 */
export const useStableByFingerprint = <T>(value: T, getFingerprint: (value: T) => string): T => {
  const valueRef = useRef(value);
  const fingerprintRef = useRef(getFingerprint(value));

  const nextFingerprint = getFingerprint(value);
  if (nextFingerprint !== fingerprintRef.current) {
    fingerprintRef.current = nextFingerprint;
    valueRef.current = value;
  }

  return valueRef.current;
};
