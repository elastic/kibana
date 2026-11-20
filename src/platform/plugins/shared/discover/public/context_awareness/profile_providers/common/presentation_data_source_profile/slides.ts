/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface PresentationSlide {
  eyebrow?: string;
  title: string;
  body?: string;
  bullets?: string[];
  footer?: string;
  variant?: 'title' | 'content';
}

/** Demo deck for Inspector snapshot import / export with Discover replay. */
export const INSPECTOR_REPLAY_SLIDES: PresentationSlide[] = [
  {
    variant: 'title',
    eyebrow: '',
    title: 'Restorable Inspector snapshots',
    body: 'Export · Import · Restore · Replay',
    footer: '',
  },
  {
    variant: 'content',
    eyebrow: '',
    title: 'The problem',
    body: '266 closed Kibana SDH issues mention Inspect / Inspector together with Discover, Lens, or Dashboards.',
    bullets: [
      'Inspect: often requested when logs give no signal',
      'Context: often lost between tickets, screenshots, and environments',
      'Reproduction: Is a pain point and consumes time',
    ],
  },
  {
    variant: 'content',
    eyebrow: '',
    title: 'ON Week draft PR',
    bullets: [
      'Import / Export in the Inspector View menu',
      'Environment details with diffs on import',
      'Per-tab replay so table and histogram show recorded responses',
      'Discover callout with Go live when you are done',
    ],
  },
  {
    variant: 'content',
    eyebrow: '',
    title: 'Demo flow',
    bullets: [
      'Switch to the Live demo tab and open Inspect',
      'Export a snapshot (optionally gzip)',
      'Import on another session / machine',
      'Restore in app → new tab replays recorded data',
      'Click Go live when finished',
    ],
    footer: 'Continue in the Live demo tab →',
  },
];
