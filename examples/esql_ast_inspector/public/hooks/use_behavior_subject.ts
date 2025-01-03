/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import type { BehaviorSubject } from 'rxjs';

export const useBehaviorSubject = <T>(subject: BehaviorSubject<T>): T => {
  const ref = useRef<T>(subject.getValue());
  const [, setCnt] = useState(0);

  useEffect(() => {
    const subscription = subject.subscribe((value) => {
      ref.current = value;
      setCnt((prev) => prev + 1);
    });
    return () => subscription.unsubscribe();
  }, [subject]);

  return ref.current;
};
