/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Animates the controls to wherever the browser has just laid them out.
 *
 * The group reorders itself while a control is being dragged by handing flexbox a new `order` for
 * each control, which lets the browser work out the wrapping and the widths. Layout cannot be
 * transitioned though, so each control would otherwise jump straight to its new place. This takes
 * the measurements either side of the change and puts every control back where it was with a
 * transform, which the browser can then transition away to nothing — each control ends up where the
 * layout put it, having appeared to slide there.
 *
 * Call `captureLayout` immediately before making a change that moves the controls; anything that
 * moved is animated once React has committed it.
 */
export const useReflowAnimation = (groupRef: React.RefObject<HTMLElement | null>) => {
  const capturedLayout = useRef<Map<Element, DOMRect> | null>(null);
  const pendingFrame = useRef<number | null>(null);

  const captureLayout = useCallback(() => {
    const group = groupRef.current;
    if (!group) return;

    // Measured rects include any transform still in flight, so an animation that is interrupted
    // carries on from where the control currently appears rather than snapping first
    capturedLayout.current = new Map(
      Array.from(group.children).map((child) => [child, child.getBoundingClientRect()])
    );
  }, [groupRef]);

  // Runs after every commit rather than on a dependency, because it is the call to `captureLayout`
  // that decides a change should be animated, not any particular piece of state changing
  useLayoutEffect(() => {
    const captured = capturedLayout.current;
    const group = groupRef.current;
    capturedLayout.current = null;
    if (!captured || !group) return;

    if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);

    const children = Array.from(group.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement
    );

    for (const child of children) {
      // Drop whatever an interrupted animation left behind, so the control is measured where the
      // layout has put it rather than where it happens to be part-way through a slide
      child.style.transition = 'none';
      child.style.transform = '';

      const before = captured.get(child);
      if (!before) continue;

      const after = child.getBoundingClientRect();
      const x = before.left - after.left;
      const y = before.top - after.top;
      if (x === 0 && y === 0) continue;

      child.style.transform = `translate(${x}px, ${y}px)`;
    }

    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null;
      for (const child of children) {
        child.style.transition = '';
        child.style.transform = '';
      }
    });
  });

  useEffect(
    () => () => {
      if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
    },
    []
  );

  return captureLayout;
};
