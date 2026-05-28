/**
 * Deterministic exact-match scorer used by MemGround probes that opt into
 * `scoring: "exact"`. Supports two modes:
 *  - Regex: gold_answer wrapped in `/.../` or `exact_regex: true`.
 *  - Substring: case-insensitive containment (default).
 *
 * Returns a JudgeResult-compatible payload (`score: 0 | 0.5 | 1`).
 *
 * We allow score=0.5 (partial) when ALL whitespace-normalized words from the
 * gold answer appear in the predicted answer, even if not contiguous. This
 * is more forgiving than strict substring without going as far as a full LLM
 * judge — useful for short factoid answers.
 */

import type { JudgeResult } from './judge.js';

const REGEX_PATTERN = /^\/(.+)\/([gimsuy]*)$/;

const normalize = (s: string): string => s.toLowerCase().normalize('NFKC').trim();

const tokens = (s: string): string[] =>
  normalize(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0);

export interface ExactMatchInput {
  gold: string;
  predicted: string;
  /** Force regex interpretation regardless of slash wrapping. */
  regex?: boolean;
}

export const scoreExactMatch = (input: ExactMatchInput): JudgeResult => {
  const gold = input.gold ?? '';
  const predicted = input.predicted ?? '';
  if (gold.length === 0) {
    return { score: predicted.length === 0 ? 1 : 0, reason: 'empty gold answer' };
  }
  const regexMatch = REGEX_PATTERN.exec(gold);
  if (input.regex || regexMatch) {
    let pattern: string;
    let flags: string;
    if (regexMatch) {
      pattern = regexMatch[1]!;
      flags = regexMatch[2] ?? '';
    } else {
      pattern = gold;
      flags = 'i';
    }
    if (!flags.includes('i')) flags += 'i';
    let re: RegExp;
    try {
      re = new RegExp(pattern, flags);
    } catch (e) {
      return { score: 0, reason: `invalid regex: ${(e as Error).message}` };
    }
    return re.test(predicted)
      ? { score: 1, reason: 'regex match' }
      : { score: 0, reason: 'regex did not match' };
  }

  const normalizedGold = normalize(gold);
  const normalizedPredicted = normalize(predicted);
  if (normalizedPredicted.includes(normalizedGold)) {
    return { score: 1, reason: 'substring match' };
  }

  const goldTokens = tokens(gold);
  const predictedTokens = new Set(tokens(predicted));
  if (goldTokens.length > 0 && goldTokens.every((t) => predictedTokens.has(t))) {
    return { score: 0.5, reason: 'all gold tokens present (non-contiguous)' };
  }
  return { score: 0, reason: 'no substring match' };
};
