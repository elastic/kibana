/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getXState } from '@kbn/router-to-openapispec';
import { parseXState, type ParseXStateResult } from './parse_x_state';

describe('parseXState', () => {
  // The exact distinct operation-level `x-state` strings present in the bundled
  // specs (oas_docs/output/kibana.yaml + kibana.serverless.yaml) as of 2026-07.
  // Captured statically rather than scraped at runtime so the test documents the
  // real hand-written variance the parser must tolerate: mixed casing of both the
  // stability label ("Technical preview") and the "added in" separator, plus the
  // bare lower-case "added in" form. Regenerate with:
  //   grep -hoE "x-state:.*" oas_docs/output/kibana*.yaml | sed 's/^x-state: //' | sort -u
  const observed: Array<{ input: string; expected: ParseXStateResult }> = [
    // Generally available (stable), with and without a since, both separator casings.
    { input: 'Generally available', expected: { tier: 'stable' } },
    {
      input: 'Generally available; added in 8.19.0',
      expected: { tier: 'stable', since: '8.19.0' },
    },
    { input: 'Generally available; added in 9.1.0', expected: { tier: 'stable', since: '9.1.0' } },
    { input: 'Generally available; added in 9.2.0', expected: { tier: 'stable', since: '9.2.0' } },
    { input: 'Generally available; added in 9.4.0', expected: { tier: 'stable', since: '9.4.0' } },
    { input: 'Generally available; Added in 9.4.0', expected: { tier: 'stable', since: '9.4.0' } },
    { input: 'Generally available; added in 9.5.0', expected: { tier: 'stable', since: '9.5.0' } },
    { input: 'Generally available; Added in 9.5.0', expected: { tier: 'stable', since: '9.5.0' } },
    { input: 'Generally available; added in 9.6.0', expected: { tier: 'stable', since: '9.6.0' } },
    // Technical Preview, both casings, with and without a since.
    { input: 'Technical Preview', expected: { tier: 'tech_preview' } },
    { input: 'Technical preview', expected: { tier: 'tech_preview' } },
    {
      input: 'Technical Preview; added in 9.4.0',
      expected: { tier: 'tech_preview', since: '9.4.0' },
    },
    // Experimental, with and without a since.
    { input: 'Experimental', expected: { tier: 'experimental' } },
    { input: 'Experimental; added in 9.1.0', expected: { tier: 'experimental', since: '9.1.0' } },
    { input: 'Experimental; added in 9.2.0', expected: { tier: 'experimental', since: '9.2.0' } },
    { input: 'Experimental; added in 9.3.0', expected: { tier: 'experimental', since: '9.3.0' } },
    { input: 'Experimental; added in 9.4.0', expected: { tier: 'experimental', since: '9.4.0' } },
    { input: 'Experimental; added in 9.5.0', expected: { tier: 'experimental', since: '9.5.0' } },
    { input: 'Experimental; added in 9.6.0', expected: { tier: 'experimental', since: '9.6.0' } },
    // Bare "added in" with no stability label -> stable default, both casings.
    { input: 'Added in 9.2.0', expected: { tier: 'stable', since: '9.2.0' } },
    { input: 'Added in 9.4.0', expected: { tier: 'stable', since: '9.4.0' } },
    { input: 'Added in 9.5.0', expected: { tier: 'stable', since: '9.5.0' } },
    { input: 'added in 9.5.0', expected: { tier: 'stable', since: '9.5.0' } },
    // Empty string (absent x-state serialized as '') -> stable default.
    { input: '', expected: { tier: 'stable' } },
  ];

  describe('every x-state string observed in the bundled specs', () => {
    test.each(observed)('$input', ({ input, expected }) => {
      expect(parseXState(input)).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('treats missing input as stable', () => {
      expect(parseXState(undefined)).toEqual({ tier: 'stable' });
    });

    it('treats whitespace-only input as stable', () => {
      expect(parseXState('   ')).toEqual({ tier: 'stable' });
    });

    it('treats an unrecognized label as stable so a break is never under-classified', () => {
      expect(parseXState('some unknown value')).toEqual({ tier: 'stable' });
    });
  });

  // Round-trip against the generator. parseXState must decode exactly what
  // getXState (the source of the generated x-state strings) produces, for every
  // stability tier and both environments. This guards the *generated* contract:
  // if getXState's wording ever drifts, this fails loudly. It is complementary to
  // the observed-strings fixture above, which guards *hand-written* reality; the
  // parser is deliberately not coupled to getXState because hand-written specs
  // deviate in casing and spacing.
  describe('round-trips getXState output for every tier and environment', () => {
    const stabilities = ['stable', 'tech_preview', 'experimental'] as const;

    stabilities.forEach((stability) => {
      const expectedTier = stability;

      it(`decodes ${stability} in the stack (non-serverless) environment`, () => {
        const encoded = getXState({ stability }, { serverless: false });
        expect(parseXState(encoded).tier).toBe(expectedTier);
      });

      it(`decodes ${stability} with a since in the stack environment`, () => {
        const encoded = getXState({ stability, since: '9.4.0' }, { serverless: false });
        expect(parseXState(encoded)).toEqual({ tier: expectedTier, since: '9.4.0' });
      });

      it(`decodes ${stability} in the serverless environment`, () => {
        const encoded = getXState({ stability, since: '9.4.0' }, { serverless: true });
        // Serverless omits `since`, so only the tier round-trips.
        expect(parseXState(encoded).tier).toBe(expectedTier);
      });
    });
  });

  // Guards future casing drift by construction: any canonical label, in any
  // casing, resolves to the same tier. A new hand-written casing variant is
  // covered without touching the observed-strings fixture above.
  describe('is case-insensitive for canonical labels', () => {
    const canonical: Array<{ label: string; tier: ParseXStateResult['tier'] }> = [
      { label: 'Generally available', tier: 'stable' },
      { label: 'Technical Preview', tier: 'tech_preview' },
      { label: 'Experimental', tier: 'experimental' },
    ];

    const casings = (label: string): string[] => [label.toLowerCase(), label.toUpperCase(), label];

    canonical.forEach(({ label, tier }) => {
      it(`maps every casing of "${label}" to ${tier}`, () => {
        casings(label).forEach((variant) => {
          expect(parseXState(variant).tier).toBe(tier);
        });
      });

      it(`maps every casing of "${label}" with a since to ${tier}`, () => {
        casings(label).forEach((variant) => {
          expect(parseXState(`${variant}; Added in 9.4.0`)).toEqual({ tier, since: '9.4.0' });
        });
      });
    });
  });
});
