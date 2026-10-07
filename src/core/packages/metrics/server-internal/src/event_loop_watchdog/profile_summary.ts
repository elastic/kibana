/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Label, type Profile } from 'pprof-format';
import { sanitize } from './sanitize';
import { BLOCK_LABEL, INNER_CONTEXT_LABEL, OUTER_CONTEXT_LABEL, TIMESTAMP_LABEL } from './types';

export interface FrameSummary {
  name: string;
  location?: string;
  /** Samples with this frame on top of the stack (self time). */
  samples: number;
  percent: number;
  /** Innermost callers of the frame's heaviest stack. */
  callers: string[];
}

export interface LabelSummary {
  outer?: string;
  inner?: string;
  samples: number;
  percent: number;
}

export interface ProfileSummary {
  /** `blocks` when samples fell within the blocks; else the whole window is summarised. */
  scope: 'blocks' | 'window';
  samples: number;
  windowSamples: number;
  frames: FrameSummary[];
  labels: LabelSummary[];
}

/** Epoch microsecond ranges, inclusive. */
export type TimeRange = readonly [number, number];

const MAX_FRAMES = 5;
const MAX_LABELS = 5;
const MAX_CALLERS = 3;
const SKIPPED_FRAMES = new Set(['(program)', '(idle)', '(root)']);

/** Returns a repo-relative path, a `node:` specifier, or a basename. */
export const sanitizeLocation = (file: string, line: number, root: string): string | undefined => {
  if (!file) return undefined;
  let path = file.replace(/^file:\/\//, '').replace(/[?#].*$/, '');
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
  if (path.startsWith(normalizedRoot)) {
    path = path.slice(normalizedRoot.length);
  } else if (!path.startsWith('node:')) {
    path = path.slice(path.lastIndexOf('/') + 1);
  }
  return sanitize(line > 0 ? `${path}:${line}` : path);
};

const percentOf = (part: number, total: number) =>
  total === 0 ? 0 : Math.round((part / total) * 1000) / 10;

/** Summarises the samples of a kept window, focusing on those taken during `blocks`. */
export const summarizeProfile = (
  profile: Profile,
  blocks: readonly TimeRange[],
  sanitizeRoot: string
): ProfileSummary => {
  const strings = profile.stringTable.strings;
  const str = (index: number | bigint) => strings[Number(index)] ?? '';
  const functions = new Map(profile.function.map((fn) => [Number(fn.id), fn]));
  // A location lists its inlined frames innermost first.
  const locations = new Map(
    profile.location.map((location) => [
      Number(location.id),
      location.line.map(({ functionId, line }) => {
        const fn = functions.get(Number(functionId));
        const name = sanitize(str(fn?.name ?? 0) || '(anonymous)');
        const at = sanitizeLocation(str(fn?.filename ?? 0), Number(line), sanitizeRoot);
        return { name, location: at, label: at ? `${name} (${at})` : name };
      }),
    ])
  );

  const all = profile.sample.map((sample) => {
    const labels = new Map(sample.label.map((label) => [str(label.key), label]));
    const timestamp = Number(labels.get(TIMESTAMP_LABEL)?.num ?? -1);
    return {
      count: Number(sample.value[0] ?? 0),
      inBlock: blocks.some(([start, end]) => timestamp >= start && timestamp <= end),
      outer: labels.has(OUTER_CONTEXT_LABEL)
        ? str(labels.get(OUTER_CONTEXT_LABEL)!.str)
        : undefined,
      inner: labels.has(INNER_CONTEXT_LABEL)
        ? str(labels.get(INNER_CONTEXT_LABEL)!.str)
        : undefined,
      stack: sample.locationId.flatMap((id) => locations.get(Number(id)) ?? []),
    };
  });
  const windowSamples = all.reduce((sum, { count }) => sum + count, 0);
  const inBlocks = all.filter(({ inBlock }) => inBlock);
  const scope = inBlocks.length > 0 ? 'blocks' : 'window';
  const selected = scope === 'blocks' ? inBlocks : all;
  const total = selected.reduce((sum, { count }) => sum + count, 0);

  const frames = new Map<string, FrameSummary & { heaviest: number }>();
  const labels = new Map<string, LabelSummary>();
  for (const { count, stack, outer, inner } of selected) {
    const [top, ...callers] = stack.filter(({ name }) => !SKIPPED_FRAMES.has(name));
    if (top) {
      const frame = frames.get(top.label) ?? {
        name: top.name,
        location: top.location,
        samples: 0,
        percent: 0,
        callers: [],
        heaviest: 0,
      };
      frame.samples += count;
      if (count > frame.heaviest) {
        frame.heaviest = count;
        frame.callers = callers.slice(0, MAX_CALLERS).map(({ label }) => label);
      }
      frames.set(top.label, frame);
    }
    const key = `${outer}\n${inner}`;
    const label = labels.get(key) ?? {
      outer: outer && sanitize(outer),
      inner: inner && sanitize(inner),
      samples: 0,
      percent: 0,
    };
    label.samples += count;
    labels.set(key, label);
  }

  const bySamples = <T extends { samples: number }>(a: T, b: T) => b.samples - a.samples;
  return {
    scope,
    samples: total,
    windowSamples,
    frames: [...frames.values()]
      .sort(bySamples)
      .slice(0, MAX_FRAMES)
      .map(({ heaviest, ...frame }) => ({ ...frame, percent: percentOf(frame.samples, total) })),
    labels: [...labels.values()]
      .sort(bySamples)
      .slice(0, MAX_LABELS)
      .map((label) => ({ ...label, percent: percentOf(label.samples, total) })),
  };
};

/**
 * Keeps only the samples within `marginUs` of `blocks`, labels those taken during a block with its
 * 1-based number, drops locations and functions no longer referenced, and narrows the time span.
 */
export const trimToBlocks = (
  profile: Profile,
  blocks: readonly TimeRange[],
  marginUs: number
): void => {
  const timestampKey = profile.stringTable.dedup(TIMESTAMP_LABEL);
  const blockKey = profile.stringTable.dedup(BLOCK_LABEL);
  let firstUs = Infinity;
  let lastUs = -Infinity;
  profile.sample = profile.sample.filter((sample) => {
    const timestamp = Number(
      sample.label.find(({ key }) => Number(key) === timestampKey)?.num ?? -1
    );
    const nearBlock = blocks.some(
      ([start, end]) => timestamp >= start - marginUs && timestamp <= end + marginUs
    );
    if (!nearBlock) return false;
    const index = blocks.findIndex(([start, end]) => timestamp >= start && timestamp <= end);
    if (index !== -1) sample.label.push(new Label({ key: blockKey, num: index + 1 }));
    firstUs = Math.min(firstUs, timestamp);
    lastUs = Math.max(lastUs, timestamp);
    return true;
  });

  const locationIds = new Set(profile.sample.flatMap(({ locationId }) => locationId.map(Number)));
  profile.location = profile.location.filter(({ id }) => locationIds.has(Number(id)));
  const functionIds = new Set(
    profile.location.flatMap(({ line }) => line.map(({ functionId }) => Number(functionId)))
  );
  profile.function = profile.function.filter(({ id }) => functionIds.has(Number(id)));
  if (profile.sample.length > 0) {
    // Epoch nanoseconds exceed Number.MAX_SAFE_INTEGER.
    profile.timeNanos = BigInt(firstUs) * 1000n;
    profile.durationNanos = BigInt(lastUs - firstUs) * 1000n;
  }
};

const describeLabel = ({ outer, inner }: LabelSummary) =>
  inner && outer ? `${inner} in ${outer}` : inner ?? outer ?? 'unlabelled';

/** Single-line, human-readable form of a kept profile. */
export const formatSummary = (
  summary: ProfileSummary,
  blockedMs: readonly number[],
  kept: string,
  file?: string
): string => {
  const blocks = blockedMs.map((ms) => `~${Math.round(ms)}ms`).join(', ') || 'none recorded';
  const samples =
    summary.scope === 'blocks'
      ? `${summary.samples}/${summary.windowSamples} samples in blocks`
      : `no samples in blocks, ${summary.windowSamples} in window`;
  const frames = summary.frames
    .slice(0, 3)
    .map(({ percent, name, location, callers }) =>
      [`${percent}% ${name}${location ? ` (${location})` : ''}`, ...callers].join(' <- ')
    )
    .join('; ');
  const labels = summary.labels
    .slice(0, 3)
    .map((label) => `${label.percent}% ${describeLabel(label)}`)
    .join(', ');
  return `Event loop block profile ${kept}: blocks [${blocks}], ${samples}. Top: ${
    frames || 'none'
  }. Labels: ${labels || 'none'}.${file ? ` File: ${file}` : ''}`;
};
