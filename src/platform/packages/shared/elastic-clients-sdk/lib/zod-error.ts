/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod'

/**
 * Tools for turning Zod v4 validation errors into concise, actionable output.
 *
 * Union schemas (e.g. the 61-variant `QueryDslQueryContainer`) produce a single
 * `invalid_union` issue whose `errors` array contains one sub-list per variant.
 * All-but-one of those sub-lists are `"received undefined"` noise from variants
 * whose discriminator key isn't present. `simplifyZodIssues` replaces each
 * `invalid_union` with the sub-list of the variant most likely to have been
 * intended, picked by depth heuristic (see `scoreVariant`). The result is a
 * flat list of issues suitable for rendering to text or emitting as JSON.
 */

type Issue = z.core.$ZodIssue
type InvalidUnionIssue = Extract<Issue, { code: 'invalid_union' }>

function isInvalidUnion (issue: Issue): issue is InvalidUnionIssue {
  return issue.code === 'invalid_union'
}

/**
 * Scores a variant's issue list as a candidate for "the user meant this variant".
 *
 * Higher is better. The dominant signal is the deepest path reached: a matched
 * discriminator lets validation descend into nested fields, producing longer
 * paths than the shallow `"received undefined"` emitted when a variant's
 * discriminator key is absent from the input.
 */
function scoreVariant (issues: readonly Issue[]): number {
  if (issues.length === 0) return -Infinity
  let maxDepth = 0
  let undefinedCount = 0
  for (const issue of issues) {
    if (issue.path.length > maxDepth) maxDepth = issue.path.length
    if (issue.code === 'invalid_type' && issue.message.includes('received undefined')) {
      undefinedCount++
    }
  }
  // Depth dominates. Fewer undefined messages and fewer total issues break ties.
  return maxDepth * 1000 - undefinedCount * 10 - issues.length
}

function pickBestVariant (variants: readonly (readonly Issue[])[]): readonly Issue[] | undefined {
  if (variants.length === 0) return undefined
  let bestIdx = 0
  let bestScore = scoreVariant(variants[0] as Issue[])
  for (let i = 1; i < variants.length; i++) {
    const s = scoreVariant(variants[i] as Issue[])
    if (s > bestScore) {
      bestScore = s
      bestIdx = i
    }
  }
  return variants[bestIdx]
}

function prefixPath (issue: Issue, prefix: readonly PropertyKey[]): Issue {
  if (prefix.length === 0) return issue
  return { ...issue, path: [...prefix, ...issue.path] } as Issue
}

/**
 * Recursively collapses `invalid_union` issues to their most likely intended
 * variant. Non-union issues pass through unchanged (with paths preserved).
 *
 * If a union has no variants (defensive) or picking a best variant is not
 * possible, the original `invalid_union` issue is preserved so information
 * isn't silently lost.
 */
export function simplifyZodIssues (issues: readonly Issue[]): Issue[] {
  const out: Issue[] = []
  for (const issue of issues) {
    if (isInvalidUnion(issue) && Array.isArray(issue.errors) && issue.errors.length > 0) {
      const best = pickBestVariant(issue.errors)
      if (best !== undefined && best.length > 0) {
        const prefixed = best.map(sub => prefixPath(sub, issue.path))
        out.push(...simplifyZodIssues(prefixed))
        continue
      }
    }
    out.push(issue)
  }
  return out
}

function formatPath (path: readonly PropertyKey[]): string {
  if (path.length === 0) return '(root)'
  let s = ''
  for (const seg of path) {
    if (typeof seg === 'number') {
      s += `[${seg}]`
    } else {
      s += s === '' ? String(seg) : `.${String(seg)}`
    }
  }
  return s
}

/**
 * Renders a flat list of issues as human-readable text. Each issue is two lines:
 *   ✖ <message>
 *     → at <path>
 */
export function formatIssuesText (issues: readonly Issue[]): string {
  if (issues.length === 0) return '✖ Invalid input'
  return issues
    .map(i => `✖ ${i.message}\n  → at ${formatPath(i.path)}`)
    .join('\n')
}
