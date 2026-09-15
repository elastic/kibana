/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse, parseDocument } from 'yaml';
import {
  appendTrigger,
  applyFallbackToStepFragment,
  collectStepNames,
  deleteStepByName,
  deleteTrigger,
  duplicateStep,
  getStepFragment,
  insertStepAtIndex,
  insertStepAtPath,
  replaceStepFragment,
  setStepFallback,
  uniqueStepName,
} from './yaml_mutations';

const BASE = `name: demo
# top comment
triggers:
  - type: manual
steps:
  - name: first
    type: console
    with:
      message: "hello {{ inputs.name }}" # keep me
  - name: second
    type: http
    with:
      url: https://example.com
`;

describe('yaml_mutations', () => {
  describe('insertStepAtIndex', () => {
    it('splices into steps at the index and preserves comments elsewhere', () => {
      const r = insertStepAtIndex(BASE, 'name: mid\ntype: wait\nwith:\n  duration: 5s\n', 1);
      expect(r.success).toBe(true);
      const parsed = parse(r.yaml);
      expect(parsed.steps.map((s: { name: string }) => s.name)).toEqual(['first', 'mid', 'second']);
      expect(r.yaml).toContain('# top comment');
      expect(r.yaml).toContain('# keep me');
      expect(r.yaml).toContain('"hello {{ inputs.name }}"');
    });

    it('creates the steps array when missing and clamps the index', () => {
      const r = insertStepAtIndex('name: empty\n', 'name: only\ntype: console\n', 5);
      expect(r.success).toBe(true);
      expect(parse(r.yaml).steps).toEqual([{ name: 'only', type: 'console' }]);
    });

    it('fails on an invalid fragment without touching the document', () => {
      const r = insertStepAtIndex(BASE, '- not: a map', 0);
      expect(r.success).toBe(false);
      expect(r.yaml).toBe(BASE);
    });
  });

  describe('insertStepAtPath', () => {
    const withIf = `name: demo
triggers:
  - type: manual
steps:
  - name: gate
    type: if
    condition: x
    steps:
      - name: yes
        type: console
    else:
      - name: no
        type: console
`;

    it('appends into an if then-branch', () => {
      const r = insertStepAtPath(
        withIf,
        'name: more\ntype: console\n',
        [{ stepIndex: 0, branch: 'steps' }],
        1
      );
      expect(r.success).toBe(true);
      expect(parse(r.yaml).steps[0].steps.map((s: { name: string }) => s.name)).toEqual([
        'yes',
        'more',
      ]);
    });

    it('creates an else array when inserting into an empty false branch', () => {
      const thenOnly = `name: demo
steps:
  - name: gate
    type: if
    condition: x
    steps:
      - name: yes
        type: console
`;
      const r = insertStepAtPath(
        thenOnly,
        'name: nope\ntype: console\n',
        [{ stepIndex: 0, branch: 'else' }],
        0
      );
      expect(r.success).toBe(true);
      expect(parse(r.yaml).steps[0].else).toEqual([{ name: 'nope', type: 'console' }]);
    });
  });

  describe('appendTrigger / deleteTrigger', () => {
    it('appends to triggers and removes by index', () => {
      const added = appendTrigger(BASE, 'type: scheduled\nwith:\n  every: 5m\n');
      expect(parse(added.yaml).triggers).toEqual([
        { type: 'manual' },
        { type: 'scheduled', with: { every: '5m' } },
      ]);
      const removed = deleteTrigger(added.yaml, 0);
      expect(parse(removed.yaml).triggers).toEqual([{ type: 'scheduled', with: { every: '5m' } }]);
    });

    it('drops the triggers key when the last trigger is removed', () => {
      const r = deleteTrigger(BASE, 0);
      expect(parse(r.yaml).triggers).toBeUndefined();
    });
  });

  describe('setStepFallback', () => {
    it('adds on-failure.fallback and keeps sibling on-failure keys', () => {
      const withRetry = BASE.replace(
        '  - name: second\n    type: http\n',
        '  - name: second\n    type: http\n    on-failure:\n      retry:\n        max-attempts: 3\n'
      );
      const r = setStepFallback(withRetry, 'second', 'name: notify\ntype: console\n');
      expect(r.success).toBe(true);
      const second = parse(r.yaml).steps[1];
      expect(second['on-failure']).toEqual({
        retry: { 'max-attempts': 3 },
        fallback: [{ name: 'notify', type: 'console' }],
      });
    });
  });

  describe('applyFallbackToStepFragment', () => {
    it('sets on-failure.fallback on a step fragment and keeps retry', () => {
      const fragment =
        'name: second\ntype: http\non-failure:\n  retry:\n    max-attempts: 3\n';
      const r = applyFallbackToStepFragment(fragment, 'name: notify\ntype: console\n');
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(parseDocument(r.fragment).toJS()).toEqual({
        name: 'second',
        type: 'http',
        'on-failure': {
          retry: { 'max-attempts': 3 },
          fallback: [{ name: 'notify', type: 'console' }],
        },
      });
    });
  });

  describe('deleteStepByName', () => {
    it('removes a top-level step including its error branch', () => {
      const withFallback = setStepFallback(BASE, 'first', 'name: notify\ntype: console\n').yaml;
      const r = deleteStepByName(withFallback, 'first');
      const names = collectStepNames(r.yaml);
      expect([...names]).toEqual(['second']);
    });

    it('removing the only fallback step clears the parent on-failure', () => {
      const withFallback = setStepFallback(BASE, 'first', 'name: notify\ntype: console\n').yaml;
      const r = deleteStepByName(withFallback, 'notify');
      expect(parse(r.yaml).steps[0]['on-failure']).toBeUndefined();
      expect(parse(r.yaml).steps[0].name).toBe('first');
    });

    it('keeps retry config when only the fallback list is emptied', () => {
      const withRetry = BASE.replace(
        '  - name: second\n    type: http\n',
        '  - name: second\n    type: http\n    on-failure:\n      retry:\n        max-attempts: 3\n'
      );
      const withFallback = setStepFallback(
        withRetry,
        'second',
        'name: notify\ntype: console\n'
      ).yaml;
      const r = deleteStepByName(withFallback, 'notify');
      expect(parse(r.yaml).steps[1]['on-failure']).toEqual({ retry: { 'max-attempts': 3 } });
    });
  });

  describe('duplicateStep', () => {
    it('inserts a copy directly below with a " copy" suffix', () => {
      const r = duplicateStep(BASE, 'first');
      expect(r.newName).toBe('first copy');
      const steps = parse(r.yaml).steps;
      expect(steps.map((s: { name: string }) => s.name)).toEqual(['first', 'first copy', 'second']);
      expect(steps[1].with.message).toBe('hello {{ inputs.name }}');
    });

    it('makes the copy name unique', () => {
      const once = duplicateStep(BASE, 'first').yaml;
      const twice = duplicateStep(once, 'first');
      expect(twice.newName).toBe('first copy_2');
    });
  });

  describe('getStepFragment / replaceStepFragment round-trip', () => {
    it('extracts a mapping fragment with its comments and puts it back verbatim', () => {
      const fragment = getStepFragment(BASE, 'first');
      expect(fragment).toContain('name: first');
      expect(fragment).toContain('# keep me');
      expect(fragment).not.toContain('- name');

      const edited = `${fragment}retry:\n  max-attempts: 2\n`;
      const r = replaceStepFragment(BASE, 'first', edited);
      expect(r.success).toBe(true);
      expect(r.yaml).toContain('# keep me');
      expect(r.yaml).toContain('# top comment');
      expect(parse(r.yaml).steps[0]).toEqual({
        name: 'first',
        type: 'console',
        with: { message: 'hello {{ inputs.name }}' },
        retry: { 'max-attempts': 2 },
      });
      expect(parse(r.yaml).steps[1].name).toBe('second');
    });

    it('preserves unknown keys and Liquid expressions in the fragment', () => {
      const fragment =
        'name: first\ntype: console\nx-custom: 1 # unknown\nwith:\n  message: "{{ a | json }}"\n';
      const r = replaceStepFragment(BASE, 'first', fragment);
      expect(r.yaml).toContain('x-custom: 1 # unknown');
      expect(r.yaml).toContain('"{{ a | json }}"');
    });
  });

  describe('uniqueStepName', () => {
    it('suffixes on collision', () => {
      expect(uniqueStepName('a', new Set(['a', 'a_2']))).toBe('a_3');
      expect(uniqueStepName('b', new Set(['a']))).toBe('b');
    });
  });
});
