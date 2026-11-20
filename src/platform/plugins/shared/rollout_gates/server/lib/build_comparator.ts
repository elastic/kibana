/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Identifies one Kibana build. `sha` is for display only; it is never compared. */
export interface BuildIdentity {
  sha: string;
  num: number;
  /** ISO 8601 */
  date: string;
}

/**
 * Orders two builds. Returns a negative number when `a` is older than `b`, a positive number
 * when `a` is newer, and zero when they are indistinguishable.
 *
 * This is the only place build ordering is decided, so the key can be swapped without
 * touching any other file.
 *
 * Ordered by `buildNum` (the git commit count a build was cut from — see
 * `src/dev/build/lib/get_build_number.ts`) because it is available directly on `packageInfo`
 * with no parsing. This has **not** been confirmed to be monotonically increasing across real
 * Serverless releases; see "Verifying build ordering" in `../../README.md`. If it turns out to
 * be unreliable (for example a shallow checkout at image-build time, or an emergency release
 * built from a commit not reachable from `main`), switch the line below to
 * `Date.parse(a.date) - Date.parse(b.date)`. `buildDate` is stamped at build time and does not
 * depend on git history, so it is the fallback key.
 */
export const compareBuilds = (a: BuildIdentity, b: BuildIdentity): number => a.num - b.num;
