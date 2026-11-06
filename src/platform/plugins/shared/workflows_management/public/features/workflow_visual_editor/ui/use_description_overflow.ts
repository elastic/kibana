/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutEffect, useRef, useState } from 'react';

/** A description of this many lines stays under its field; a longer one moves behind an icon. */
export const DESCRIPTION_MAX_LINES = 2;

/**
 * Whether `description` takes more than `DESCRIPTION_MAX_LINES` lines at the width the field
 * has now. Attach `measureRef` to a hidden element that carries the description in the help text
 * typography and is clamped to that many lines: the text overflows the clamp exactly when it is
 * too long. It follows the width as the panel is resized.
 */
export const useDescriptionOverflow = (description: string | undefined) => {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [isLong, setIsLong] = useState(false);

  useLayoutEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const measure = () => setIsLong(element.scrollHeight > element.clientHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [description]);

  return { measureRef, isLong: Boolean(description) && isLong };
};
