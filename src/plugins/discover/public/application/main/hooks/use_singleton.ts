/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useRef } from 'react';

/**
 * Allows lazy initialization of a singleton
 * Context: https://reactjs.org/docs/hooks-faq.html#how-to-create-expensive-objects-lazily
 * Why not using useMemo: We're using the useMemo here also kind of as a guarantee to
 * only instantiate that subject once. Unfortunately useMemo explicitly does not give
 * those guarantees:
 * https://reactjs.org/docs/hooks-reference.html#usememo
 */
export function useSingleton<T>(initialize: () => T): T {
  const ref = useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = initialize();
  }

  return ref.current;
}
