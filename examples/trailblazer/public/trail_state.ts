/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexKind } from '../common';
import { QUERY_LANGUAGES } from '../common';
import type { SavedObjectTarget } from '../common/saved_objects';
import type { TrailContext } from './context';
import { toIndexInfo } from './context';
import { includeHiddenFor } from './preferences';
import type { SearchState } from './query';
import type { Pane } from './trail';

export const TRAIL_URL_PARAM = 'trail';

const INDEX_KINDS: readonly IndexKind[] = ['index', 'alias', 'data_stream'];
const MAX_STEPS = 50;
const SAMPLE_SIZE = 50;

/** A serializable description of one pane, enough to reopen it. */
export type TrailStep =
  | { readonly pane: 'index_list'; readonly kind: IndexKind }
  | { readonly pane: 'index'; readonly search: SearchState }
  | {
      readonly pane: 'document';
      readonly search: SearchState;
      readonly index: string;
      readonly id: string;
    }
  | { readonly pane: 'field'; readonly search: SearchState; readonly field: string }
  | { readonly pane: 'saved_object_types' }
  | { readonly pane: 'saved_objects'; readonly type: string }
  | { readonly pane: 'saved_object'; readonly target: SavedObjectTarget };

export function encodeTrail(steps: readonly TrailStep[]): string {
  return JSON.stringify(steps);
}

/** Parses steps from untrusted URL text, keeping the valid steps up to the first invalid one. */
export function decodeTrail(text: string | null): TrailStep[] {
  if (!text) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const steps: TrailStep[] = [];
  for (const value of parsed.slice(0, MAX_STEPS)) {
    const step = toStep(value);
    if (!step) break;
    steps.push(step);
  }
  return steps;
}

/**
 * Reopens `steps` to the right of `root`. Stops at the first step that can no longer be loaded,
 * or once the user opens something else.
 */
export async function restoreTrail(
  ctx: TrailContext,
  root: Pane,
  steps: readonly TrailStep[],
  signal: AbortSignal
): Promise<void> {
  let parent = root;
  for (const step of steps) {
    if (signal.aborted) return;
    const pane = await openStep(ctx, parent, step, signal).catch(() => undefined);
    if (!pane) return;
    parent = pane;
  }
  if (!signal.aborted && ctx.trail.isLast(parent)) parent.focus();
}

async function openStep(
  ctx: TrailContext,
  parent: Pane,
  step: TrailStep,
  signal: AbortSignal
): Promise<Pane | undefined> {
  const open = await loadStep(ctx, step, signal);
  return open && !signal.aborted && ctx.trail.isLast(parent) ? open(parent) : undefined;
}

/** Loads what a step's pane needs, returning a function that opens it, or undefined if it is gone. */
async function loadStep(
  ctx: TrailContext,
  step: TrailStep,
  signal: AbortSignal
): Promise<((parent: Pane) => Pane) | undefined> {
  const { api, preferences } = ctx;
  switch (step.pane) {
    case 'index_list':
      return (parent) => ctx.openIndexList(parent, step.kind);
    case 'index':
      return (parent) => ctx.openIndex(parent, step.search);
    case 'saved_object_types':
      return (parent) => ctx.openSavedObjectTypes(parent);
    case 'saved_object':
      return (parent) => ctx.openSavedObject(parent, step.target);
    case 'saved_objects': {
      const { types } = await api.getSavedObjectTypes(signal);
      const type = types.find(({ name }) => name === step.type);
      return type ? (parent) => ctx.openSavedObjects(parent, type) : undefined;
    }
    case 'document': {
      const { search, index, id } = step;
      const info = toIndexInfo(
        await api.getFields(search.index, includeHiddenFor(preferences, search.index), signal)
      );
      const { hits } = await api.search(
        {
          index,
          includeHidden: includeHiddenFor(preferences, index),
          language: 'dsl',
          query: JSON.stringify({ ids: { values: [id] } }),
          size: 1,
          from: 0,
        },
        signal
      );
      const [hit] = hits;
      return hit ? (parent) => ctx.openDocument(parent, { search, info, hit }) : undefined;
    }
    case 'field': {
      const { search } = step;
      const includeHidden = includeHiddenFor(preferences, search.index);
      const info = toIndexInfo(await api.getFields(search.index, includeHidden, signal));
      const field = info.fieldsByName.get(step.field);
      if (!field) return undefined;
      const sampleHits = field.aggregatable
        ? []
        : (
            await api.search(
              {
                ...search,
                includeHidden,
                size: SAMPLE_SIZE,
                from: 0,
                sortField: info.timeField,
              },
              signal
            )
          ).hits;
      return (parent) => ctx.openField(parent, { search, info, field, sampleHits });
    }
  }
}

function toStep(value: unknown): TrailStep | undefined {
  if (!isRecord(value)) return undefined;
  switch (value.pane) {
    case 'index_list': {
      const kind = INDEX_KINDS.find((candidate) => candidate === value.kind);
      return kind ? { pane: 'index_list', kind } : undefined;
    }
    case 'index': {
      const search = toSearch(value.search);
      return search ? { pane: 'index', search } : undefined;
    }
    case 'document': {
      const search = toSearch(value.search);
      const { index, id } = value;
      return search && isName(index) && isName(id)
        ? { pane: 'document', search, index, id }
        : undefined;
    }
    case 'field': {
      const search = toSearch(value.search);
      const { field } = value;
      return search && isName(field) ? { pane: 'field', search, field } : undefined;
    }
    case 'saved_object_types':
      return { pane: 'saved_object_types' };
    case 'saved_objects':
      return isName(value.type) ? { pane: 'saved_objects', type: value.type } : undefined;
    case 'saved_object': {
      if (!isRecord(value.target)) return undefined;
      const { type, id, space } = value.target;
      if (!isName(type) || !isName(id)) return undefined;
      return {
        pane: 'saved_object',
        target: isName(space) ? { type, id, space } : { type, id },
      };
    }
  }
  return undefined;
}

function toSearch(value: unknown): SearchState | undefined {
  if (!isRecord(value)) return undefined;
  const { index, query } = value;
  const language = QUERY_LANGUAGES.find((candidate) => candidate === value.language);
  if (!isName(index) || !language || typeof query !== 'string') return undefined;
  return { index, language, query };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isName(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}
