import { describe, expect, it } from 'vitest';

import { scoreExactMatch } from '../memground_score.js';

describe('scoreExactMatch', () => {
  it('returns 1 on a case-insensitive substring match', () => {
    expect(
      scoreExactMatch({ gold: 'oat milk', predicted: 'I drink Oat Milk every day.' }).score
    ).toBe(1);
  });

  it('returns 0.5 when all gold tokens are present but not contiguous', () => {
    expect(
      scoreExactMatch({ gold: 'oat milk', predicted: 'milk... mostly the oat variety' }).score
    ).toBe(0.5);
  });

  it('returns 0 when no tokens match', () => {
    expect(
      scoreExactMatch({ gold: 'oat milk', predicted: 'orange juice' }).score
    ).toBe(0);
  });

  it('handles unicode normalization (NFKC) and case', () => {
    expect(
      scoreExactMatch({ gold: 'Tomás', predicted: "VP's name is tomás" }).score
    ).toBe(1);
  });

  it('honours regex=true', () => {
    expect(
      scoreExactMatch({
        gold: '^Brutus$',
        predicted: 'Brutus',
        regex: true,
      }).score
    ).toBe(1);
    expect(
      scoreExactMatch({
        gold: '^Brutus$',
        predicted: 'Marcus Brutus',
        regex: true,
      }).score
    ).toBe(0);
  });

  it('interprets /.../flags as regex', () => {
    expect(
      scoreExactMatch({ gold: '/^answer.*\\d+$/i', predicted: 'Answer is 42' }).score
    ).toBe(1);
  });

  it('returns 0 on invalid regex', () => {
    const r = scoreExactMatch({ gold: '/(?:[/', predicted: 'foo' });
    expect(r.score).toBe(0);
    expect(r.reason).toMatch(/invalid regex/);
  });

  it('empty gold + empty predicted = 1; empty gold + non-empty = 0', () => {
    expect(scoreExactMatch({ gold: '', predicted: '' }).score).toBe(1);
    expect(scoreExactMatch({ gold: '', predicted: 'anything' }).score).toBe(0);
  });
});
