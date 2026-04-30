/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEPRECATED_STEP_METADATA,
  DEPRECATED_STEP_PREFIX_METADATA,
  getDeprecatedStepMessage,
  getStepDeprecationInfo,
  isDeprecatedStepType,
} from './deprecated_step_metadata';

describe('deprecated_step_metadata', () => {
  describe('getStepDeprecationInfo', () => {
    it('returns deprecation info for exact-match step types', () => {
      const info = getStepDeprecationInfo('kibana.createCase');
      expect(info).toEqual({ replacementStepType: 'cases.createCase' });
    });

    it('returns undefined for non-deprecated step types', () => {
      expect(getStepDeprecationInfo('cases.createCase')).toBeUndefined();
    });

    it('returns deprecation info for prefix-matched step types', () => {
      expect(getStepDeprecationInfo('inference.completion')).toEqual({
        replacementStepType: 'ai.prompt',
      });
      expect(getStepDeprecationInfo('bedrock.invokeAI')).toEqual({
        replacementStepType: 'ai.prompt',
      });
      expect(getStepDeprecationInfo('gen-ai.run')).toEqual({
        replacementStepType: 'ai.prompt',
      });
      expect(getStepDeprecationInfo('gemini.invokeStream')).toEqual({
        replacementStepType: 'ai.prompt',
      });
    });

    it('does not match prefixes without the trailing dot', () => {
      // 'inference' alone should not match the 'inference.' prefix
      expect(getStepDeprecationInfo('inference')).toBeUndefined();
      expect(getStepDeprecationInfo('bedrock')).toBeUndefined();
    });

    it('prioritizes exact match over prefix match', () => {
      // Verify all exact-match entries are still returned correctly
      for (const [stepType, info] of Object.entries(DEPRECATED_STEP_METADATA)) {
        expect(getStepDeprecationInfo(stepType)).toEqual(info);
      }
    });

    it('does not deprecate unrelated step types', () => {
      expect(getStepDeprecationInfo('http')).toBeUndefined();
      expect(getStepDeprecationInfo('ai.prompt')).toBeUndefined();
      expect(getStepDeprecationInfo('elasticsearch.search')).toBeUndefined();
    });
  });

  describe('isDeprecatedStepType', () => {
    it('returns true for exact-match deprecated step types', () => {
      expect(isDeprecatedStepType('kibana.createCase')).toBe(true);
    });

    it('returns true for prefix-matched deprecated step types', () => {
      expect(isDeprecatedStepType('inference.completion')).toBe(true);
      expect(isDeprecatedStepType('gen-ai.invokeAI')).toBe(true);
    });

    it('returns false for non-deprecated step types', () => {
      expect(isDeprecatedStepType('ai.prompt')).toBe(false);
      expect(isDeprecatedStepType('http')).toBe(false);
    });
  });

  describe('getDeprecatedStepMessage', () => {
    it('formats message with replacement step type', () => {
      const message = getDeprecatedStepMessage('inference.completion', {
        replacementStepType: 'ai.prompt',
      });
      expect(message).toBe(
        'Step type "inference.completion" is deprecated. Use "ai.prompt" instead.'
      );
    });

    it('uses custom message when provided', () => {
      const message = getDeprecatedStepMessage('old.step', {
        message: 'Custom deprecation notice.',
      });
      expect(message).toBe('Custom deprecation notice.');
    });

    it('falls back to generic message when no replacement', () => {
      const message = getDeprecatedStepMessage('old.step', {});
      expect(message).toBe('Step type "old.step" is deprecated.');
    });
  });

  describe('DEPRECATED_STEP_PREFIX_METADATA', () => {
    it('includes all AI connector prefixes', () => {
      const prefixes = DEPRECATED_STEP_PREFIX_METADATA.map((entry) => entry.prefix);
      expect(prefixes).toContain('inference.');
      expect(prefixes).toContain('bedrock.');
      expect(prefixes).toContain('gen-ai.');
      expect(prefixes).toContain('gemini.');
    });

    it('all prefix entries suggest ai.prompt as replacement', () => {
      for (const entry of DEPRECATED_STEP_PREFIX_METADATA) {
        expect(entry.deprecation.replacementStepType).toBe('ai.prompt');
      }
    });
  });
});
