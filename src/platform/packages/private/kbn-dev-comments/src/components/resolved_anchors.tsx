/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type PropsWithChildren,
} from 'react';
import { placeAnchor, type PlacedAnchor } from '../lib/anchor';
import { createAnchorResolver } from '../lib/anchor_resolver';
import { useCommentsState, usePageComments } from './comments_context';
import { layoutTracker, useLayoutTick } from './hooks';

export type ResolvedAnchors = ReadonlyMap<string, PlacedAnchor | null>;

const ResolvedAnchorsContext = createContext<ResolvedAnchors>(new Map());

/**
 * Resolves the current page's anchors once per layout change, for pins, panel
 * and guide alike, and has the layout tracker watch the elements found, so that
 * a resize of one (an image loading) moves its pin.
 */
export const ResolvedAnchorsProvider = ({ children }: PropsWithChildren) => {
  const comments = usePageComments();
  const tick = useLayoutTick();
  const [resolver] = useState(createAnchorResolver);
  const [, retry] = useReducer((retries: number) => retries + 1, 0);

  const { resolved, retryAt } = resolver.resolve(comments, { tick, now: Date.now() });
  // A screenshot shown full screen covers the page and the pins; hit-tested, the thread's pin would go, and the screenshot with it.
  const overlayOpen = useCommentsState((state) => state.overlayOpen);
  const placed = new Map<string, PlacedAnchor | null>(
    comments.map(({ id, anchor }) => {
      const match = resolved.get(id);
      return [id, match ? placeAnchor(anchor, match, overlayOpen ? { exposed: true } : {}) : null];
    })
  );

  // Searches put off are made once their time has come, even on a page gone quiet.
  // No dependencies: a render finding the wait a moment short of over must set the timer again.
  useEffect(() => {
    if (retryAt === undefined) {
      return;
    }
    const timer = setTimeout(retry, Math.max(0, retryAt - Date.now()));
    return () => clearTimeout(timer);
  });

  // After every render, so the watched set follows what resolved; the tracker only diffs.
  useEffect(() => {
    layoutTracker.watch(
      Array.from(resolved.values()).flatMap((match) => (match ? [match.element] : []))
    );
  });

  return (
    <ResolvedAnchorsContext.Provider value={placed}>{children}</ResolvedAnchorsContext.Provider>
  );
};

export const useResolvedAnchors = (): ResolvedAnchors => useContext(ResolvedAnchorsContext);

export const useResolvedAnchor = (id: string): PlacedAnchor | null =>
  useResolvedAnchors().get(id) ?? null;
