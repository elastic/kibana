/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Annotation, AnnotationsApi } from '../types';

const withoutImage = (annotation: Annotation): Annotation =>
  annotation.snapshot
    ? { ...annotation, snapshot: { ...annotation.snapshot, image: undefined } }
    : annotation;

const withoutSnapshot = ({ snapshot, ...annotation }: Annotation): Annotation => annotation;

/** In-memory `AnnotationsApi` for Storybook and tests; mirrors a host's semantics. */
export const createInMemoryAnnotationsApi = (initial: Annotation[] = []): AnnotationsApi => {
  const annotations = new Map(initial.map((annotation) => [annotation.id, annotation]));
  let counter = 0;

  /** Sequential ids that skip anything seeded or imported under the same scheme. */
  const nextId = (prefix: string): string => {
    const taken = new Set([
      ...annotations.keys(),
      ...Array.from(annotations.values()).flatMap(({ replies }) => replies.map(({ id }) => id)),
    ]);
    let id: string;
    do {
      counter += 1;
      id = `${prefix}-${counter}`;
    } while (taken.has(id));
    return id;
  };

  const require = (id: string): Annotation => {
    const annotation = annotations.get(id);
    if (!annotation) {
      throw new Error(`Annotation [${id}] not found`);
    }
    return annotation;
  };

  return {
    list: async () =>
      Array.from(annotations.values())
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(withoutImage),
    getSnapshot: async (id) => require(id).snapshot,
    create: async (input) => {
      const now = new Date().toISOString();
      const annotation: Annotation = {
        ...input,
        id: nextId('annotation'),
        createdAt: now,
        updatedAt: now,
      };
      annotations.set(annotation.id, annotation);
      return withoutImage(annotation);
    },
    update: async (id, patch) => {
      const current = require(id);
      const now = new Date().toISOString();
      const updated: Annotation = {
        ...current,
        resolved: patch.resolved ?? current.resolved,
        replies: patch.reply
          ? [...current.replies, { id: nextId('reply'), ...patch.reply, createdAt: now }]
          : current.replies,
        updatedAt: now,
      };
      annotations.set(id, updated);
      return withoutImage(updated);
    },
    exportAll: async () => ({
      version: 2,
      exportedAt: new Date().toISOString(),
      annotations: Array.from(annotations.values()).map(withoutSnapshot),
    }),
    importAll: async (payload) => {
      payload.annotations.forEach((annotation) => annotations.set(annotation.id, annotation));
      return { imported: payload.annotations.length, skipped: 0, failed: 0 };
    },
  };
};
