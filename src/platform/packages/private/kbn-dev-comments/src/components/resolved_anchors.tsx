/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useEffect, type PropsWithChildren } from 'react';
import { resolveAnchor, type ResolvedAnchor } from '../lib/anchor';
import { usePageComments } from './comments_context';
import { layoutTracker, useLayoutTick } from './hooks';

/** Where each of the current page's comments is right now, by comment id; null when its element is not in the DOM. */
export type ResolvedAnchors = ReadonlyMap<string, ResolvedAnchor | null>;

const ResolvedAnchorsContext = createContext<ResolvedAnchors>(new Map());

/**
 * Resolves the current page's anchors once per layout change for pins, panel
 * and guide alike, and has the layout tracker watch the elements found, so a
 * resize of one of them (an image loading, a panel growing) moves its pin.
 */
export const ResolvedAnchorsProvider = ({ children }: PropsWithChildren) => {
  const comments = usePageComments();
  // Every layout tick re-renders the provider: the DOM may have changed under the anchors.
  useLayoutTick();

  const resolved: ResolvedAnchors = new Map(
    comments.map(({ id, anchor }) => [id, resolveAnchor(anchor)])
  );

  // After every render, so the watched set follows what resolved; the tracker only diffs.
  useEffect(() => {
    layoutTracker.watch(
      Array.from(resolved.values()).flatMap((match) => (match ? [match.element] : []))
    );
  });

  return (
    <ResolvedAnchorsContext.Provider value={resolved}>{children}</ResolvedAnchorsContext.Provider>
  );
};

export const useResolvedAnchors = (): ResolvedAnchors => useContext(ResolvedAnchorsContext);

export const useResolvedAnchor = (id: string): ResolvedAnchor | null =>
  useResolvedAnchors().get(id) ?? null;
