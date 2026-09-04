/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStepFamily } from './get_step_family';

describe('getStepFamily', () => {
  // ── trigger ────────────────────────────────────────────────────────────────
  describe('trigger family', () => {
    it('returns trigger when isTrigger=true regardless of type', () => {
      expect(getStepFamily('anything', true)).toBe('trigger');
    });

    it('returns trigger for TRIGGER_STEP_TYPES members', () => {
      expect(getStepFamily('manual', false)).toBe('trigger');
      expect(getStepFamily('alert', false)).toBe('trigger');
      expect(getStepFamily('scheduled', false)).toBe('trigger');
    });

    it('returns trigger for trigger_ prefix', () => {
      expect(getStepFamily('trigger_manual', false)).toBe('trigger');
      expect(getStepFamily('trigger_alert', false)).toBe('trigger');
    });

    it('strips leading dot before checking', () => {
      // No TRIGGER_STEP_TYPES start with a dot, but ensure the strip logic
      // doesn't accidentally match something else.
      expect(getStepFamily('.manual', true)).toBe('trigger');
    });
  });

  // ── code ───────────────────────────────────────────────────────────────────
  describe('code family', () => {
    it('returns code for console (doc override — StepCategory says Kibana)', () => {
      expect(getStepFamily('console', false)).toBe('code');
    });

    it('returns code for http', () => {
      expect(getStepFamily('http', false)).toBe('code');
    });

    it('returns code for inference', () => {
      expect(getStepFamily('inference', false)).toBe('code');
    });

    it('returns code for ai.* prefixed types', () => {
      expect(getStepFamily('ai.prompt', false)).toBe('code');
      expect(getStepFamily('ai.agent', false)).toBe('code');
    });
  });

  // ── data ───────────────────────────────────────────────────────────────────
  describe('data family', () => {
    it('returns data for data.* prefixed extension steps', () => {
      expect(getStepFamily('data.set', false)).toBe('data');
      expect(getStepFamily('data.map', false)).toBe('data');
      expect(getStepFamily('data.filter', false)).toBe('data');
    });
  });

  // ── brand ──────────────────────────────────────────────────────────────────
  describe('brand family', () => {
    it('returns brand for elasticsearch* prefixed types', () => {
      expect(getStepFamily('elasticsearch', false)).toBe('brand');
      expect(getStepFamily('elasticsearch.index', false)).toBe('brand');
    });

    it('returns brand for kibana* prefixed types', () => {
      expect(getStepFamily('kibana', false)).toBe('brand');
      expect(getStepFamily('kibana.alerting.rule', false)).toBe('brand');
    });

    it('strips leading dot before matching prefix', () => {
      expect(getStepFamily('.elasticsearch', false)).toBe('brand');
      expect(getStepFamily('.kibana', false)).toBe('brand');
    });
  });

  // ── flow ───────────────────────────────────────────────────────────────────
  describe('flow family', () => {
    it('returns flow for builtin flow-control step types', () => {
      // Spot-check a selection — all are StepCategory.FlowControl builtins.
      expect(getStepFamily('if', false)).toBe('flow');
      expect(getStepFamily('switch', false)).toBe('flow');
      expect(getStepFamily('foreach', false)).toBe('flow');
      expect(getStepFamily('while', false)).toBe('flow');
      expect(getStepFamily('parallel', false)).toBe('flow');
      expect(getStepFamily('wait', false)).toBe('flow');
      expect(getStepFamily('waitForInput', false)).toBe('flow');
      expect(getStepFamily('waitForApproval', false)).toBe('flow');
      expect(getStepFamily('loop.break', false)).toBe('flow');
      expect(getStepFamily('loop.continue', false)).toBe('flow');
      expect(getStepFamily('workflow.execute', false)).toBe('flow');
      expect(getStepFamily('workflow.executeAsync', false)).toBe('flow');
    });
  });

  // ── external ───────────────────────────────────────────────────────────────
  describe('external family (default)', () => {
    it('returns external for unknown connector types', () => {
      expect(getStepFamily('slack', false)).toBe('external');
      expect(getStepFamily('.email', false)).toBe('external');
      expect(getStepFamily('pagerduty', false)).toBe('external');
      expect(getStepFamily('totally_unknown', false)).toBe('external');
    });
  });
});
