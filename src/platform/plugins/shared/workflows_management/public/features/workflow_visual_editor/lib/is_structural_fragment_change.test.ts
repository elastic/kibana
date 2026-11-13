/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isStructuralFragmentChange } from './is_structural_fragment_change';

const SET_STEP = `name: build_target
type: data.set
with:
  target: a
`;

describe('isStructuralFragmentChange', () => {
  describe('settings that can wait for the computation debounce', () => {
    it.each([
      ['a value inside with', SET_STEP, SET_STEP.replace('target: a', 'target: ab')],
      ['a new key inside with', SET_STEP, `${SET_STEP}  other: 1\n`],
      ['a step-level if', SET_STEP, `${SET_STEP}if: steps.x.output.ok\n`],
      ['a timeout', SET_STEP, `${SET_STEP}timeout: 30s\n`],
      [
        'a foreach expression',
        "name: loop\ntype: foreach\nforeach: '{{ a }}'\n",
        "name: loop\ntype: foreach\nforeach: '{{ ab }}'\n",
      ],
    ])('is not structural: %s', (_label, previous, next) => {
      expect(isStructuralFragmentChange(previous, next)).toBe(false);
    });

    it('is not structural when nothing changed', () => {
      expect(isStructuralFragmentChange(SET_STEP, SET_STEP)).toBe(false);
    });

    it('ignores formatting that does not change the parsed step', () => {
      expect(isStructuralFragmentChange(SET_STEP, `# note\n${SET_STEP}`)).toBe(false);
    });
  });

  describe('changes the canvas has to draw at once', () => {
    const switchStep = (cases: string) => `name: pick\ntype: switch\ncases:\n${cases}`;
    const parallelStep = (branches: string) => `name: fan\ntype: parallel\nbranches:\n${branches}`;

    it.each([
      ['a rename', SET_STEP, SET_STEP.replace('build_target', 'build_other')],
      ['a type change', SET_STEP, SET_STEP.replace('data.set', 'data.map')],
      [
        'a switch case added',
        switchStep('  - match: a\n    steps: []\n'),
        switchStep('  - match: a\n    steps: []\n  - match: b\n    steps: []\n'),
      ],
      [
        'a switch case label edited',
        switchStep('  - match: a\n    steps: []\n'),
        switchStep('  - match: ab\n    steps: []\n'),
      ],
      [
        'a parallel branch added',
        parallelStep('  - name: one\n    steps: []\n'),
        parallelStep('  - name: one\n    steps: []\n  - name: two\n    steps: []\n'),
      ],
      [
        'a nested step in a body',
        'name: loop\ntype: foreach\nforeach: x\nsteps: []\n',
        'name: loop\ntype: foreach\nforeach: x\nsteps:\n  - name: inner\n    type: console\n',
      ],
      [
        'an else body',
        'name: gate\ntype: if\ncondition: x\nsteps: []\n',
        'name: gate\ntype: if\ncondition: x\nsteps: []\nelse: []\n',
      ],
      [
        'a default body',
        'name: pick\ntype: switch\ncases: []\n',
        'name: pick\ntype: switch\ncases: []\ndefault: []\n',
      ],
      ['continue on failure turned on', SET_STEP, `${SET_STEP}on-failure:\n  continue: true\n`],
      [
        'a retry setting under on-failure',
        `${SET_STEP}on-failure:\n  retry:\n    max-attempts: 2\n`,
        `${SET_STEP}on-failure:\n  retry:\n    max-attempts: 3\n`,
      ],
    ])('is structural: %s', (_label, previous, next) => {
      expect(isStructuralFragmentChange(previous, next)).toBe(true);
    });
  });

  describe('fragments that cannot be compared', () => {
    it('is structural without a previous fragment', () => {
      expect(isStructuralFragmentChange(null, SET_STEP)).toBe(true);
      expect(isStructuralFragmentChange(undefined, SET_STEP)).toBe(true);
    });

    it('is structural when the previous fragment does not parse', () => {
      expect(isStructuralFragmentChange('name: [unclosed', SET_STEP)).toBe(true);
    });

    it('is structural when the next fragment does not parse', () => {
      expect(isStructuralFragmentChange(SET_STEP, 'name: [unclosed')).toBe(true);
    });

    it('is structural when a fragment is not a map', () => {
      expect(isStructuralFragmentChange(SET_STEP, '- just\n- a list\n')).toBe(true);
      expect(isStructuralFragmentChange('plain text', SET_STEP)).toBe(true);
    });
  });
});
