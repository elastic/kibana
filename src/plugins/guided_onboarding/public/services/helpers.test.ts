/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { testGuideConfig, testGuideId } from '../../common';
import type { GuidesConfig } from '../../common';
import {
  findGuideConfigByGuideId,
  getCompletedSteps,
  getInProgressStepConfig,
  getInProgressStepId,
  getStepConfig,
  isGuideActive,
  isLastStep,
  isStepInProgress,
  isStepReadyToComplete,
} from './helpers';
import {
  mockPluginStateInProgress,
  mockPluginStateNotStarted,
  testGuideFirstStep,
  testGuideLastStep,
  testGuideManualCompletionStep,
  testGuideStep1ActiveState,
  testGuideStep1InProgressState,
  testGuideStep2InProgressState,
  testGuideStep2ReadyToCompleteState,
} from './api.mocks';

describe('GuidedOnboarding ApiService helpers', () => {
  describe('findGuideConfigByGuideId', () => {
    it('returns undefined if the config is not found', () => {
      const config = findGuideConfigByGuideId(
        { testGuide: testGuideConfig } as GuidesConfig,
        'security'
      );
      expect(config).toBeUndefined();
    });

    it('returns the correct config guide', () => {
      const config = findGuideConfigByGuideId(
        { testGuide: testGuideConfig } as GuidesConfig,
        testGuideId
      );
      expect(config).not.toBeUndefined();
    });
  });

  describe('getStepConfig', () => {
    it('returns undefined if the config is not found', async () => {
      const config = getStepConfig(undefined, testGuideId, testGuideFirstStep);
      expect(config).toBeUndefined();
    });

    it('returns the config for the step', async () => {
      const config = getStepConfig(testGuideConfig, testGuideId, testGuideFirstStep);
      expect(config).toHaveProperty('title');
    });
  });

  describe('isLastStep', () => {
    it('returns true if the passed params are for the last step', () => {
      const result = isLastStep(testGuideConfig, testGuideId, testGuideLastStep);
      expect(result).toBe(true);
    });

    it('returns false if the passed params are not for the last step', () => {
      const result = isLastStep(testGuideConfig, testGuideId, testGuideFirstStep);
      expect(result).toBe(false);
    });
  });

  describe('getInProgressStepId', () => {
    it('returns undefined if no step is in progress', () => {
      const stepId = getInProgressStepId(testGuideStep1ActiveState);
      expect(stepId).toBeUndefined();
    });
    it('returns the correct step if that is in progress', () => {
      const stepId = getInProgressStepId(testGuideStep1InProgressState);
      expect(stepId).toBe('step1');
    });
  });

  describe('getInProgressStepConfig', () => {
    it('returns undefined if no guide config', () => {
      const stepConfig = getInProgressStepConfig(undefined, testGuideStep1ActiveState);
      expect(stepConfig).toBeUndefined();
    });

    it('returns undefined if no step is in progress', () => {
      const stepConfig = getInProgressStepConfig(testGuideConfig, testGuideStep1ActiveState);
      expect(stepConfig).toBeUndefined();
    });

    it('returns the correct step config for the step in progress', () => {
      const stepConfig = getInProgressStepConfig(testGuideConfig, testGuideStep1InProgressState);
      expect(stepConfig).toEqual(testGuideConfig.steps[0]);
    });
  });

  describe('isGuideActive', () => {
    it('returns false if plugin state is undefined', () => {
      const isActive = isGuideActive(undefined, testGuideId);
      expect(isActive).toBe(false);
    });

    it('returns true if guideId is undefined and the guide is active', () => {
      const isActive = isGuideActive(mockPluginStateInProgress, undefined);
      expect(isActive).toBe(true);
    });

    it('returns false if guideId is undefined and the guide is not active', () => {
      const isActive = isGuideActive(mockPluginStateNotStarted, undefined);
      expect(isActive).toBe(false);
    });

    it('returns false if guide is not in progress', () => {
      const isActive = isGuideActive(mockPluginStateInProgress, 'security');
      expect(isActive).toBe(false);
    });

    it('returns true if guide is in progress', () => {
      const isActive = isGuideActive(mockPluginStateInProgress, testGuideId);
      expect(isActive).toBe(true);
    });
  });

  describe('isStepInProgress', () => {
    it('returns false if guide state is undefined', () => {
      const isInProgress = isStepInProgress(undefined, testGuideId, testGuideFirstStep);
      expect(isInProgress).toBe(false);
    });

    it('returns false if guide is not active', () => {
      const isInProgress = isStepInProgress(
        testGuideStep1InProgressState,
        'security',
        testGuideFirstStep
      );
      expect(isInProgress).toBe(false);
    });

    it('returns false if step is not in progress', () => {
      const isInProgress = isStepInProgress(
        testGuideStep1InProgressState,
        testGuideId,
        testGuideLastStep
      );
      expect(isInProgress).toBe(false);
    });

    it('returns true if step is in progress', () => {
      const isInProgress = isStepInProgress(
        testGuideStep1InProgressState,
        testGuideId,
        testGuideFirstStep
      );
      expect(isInProgress).toBe(true);
    });
  });

  describe('isStepReadyToComplete', () => {
    it('returns false if guide state is undefined', () => {
      const isReadyToComplete = isStepReadyToComplete(undefined, testGuideId, testGuideFirstStep);
      expect(isReadyToComplete).toBe(false);
    });

    it('returns false if guide is not active', () => {
      const isReadyToComplete = isStepReadyToComplete(
        testGuideStep1InProgressState,
        'security',
        testGuideFirstStep
      );
      expect(isReadyToComplete).toBe(false);
    });

    it('returns false if step is not ready not complete', () => {
      const isReadyToComplete = isStepReadyToComplete(
        testGuideStep2ReadyToCompleteState,
        testGuideId,
        testGuideLastStep
      );
      expect(isReadyToComplete).toBe(false);
    });

    it('returns true if step is ready to complete', () => {
      const isInProgress = isStepReadyToComplete(
        testGuideStep2ReadyToCompleteState,
        testGuideId,
        testGuideManualCompletionStep
      );
      expect(isInProgress).toBe(true);
    });
  });

  describe('getCompletedSteps', () => {
    it('completes the step if setToReadyToComplete is false', () => {
      const completedSteps = getCompletedSteps(
        testGuideStep1InProgressState,
        testGuideFirstStep,
        false
      );
      expect(completedSteps[0].status).toBe('complete');
      // the next step is active
      expect(completedSteps[1].status).toBe('active');
    });

    it('sets the step to ready_to_complete if setToReadyToComplete is true', () => {
      const completedSteps = getCompletedSteps(
        testGuideStep2InProgressState,
        testGuideManualCompletionStep,
        true
      );
      expect(completedSteps[1].status).toBe('ready_to_complete');
      // the next step is inactive
      expect(completedSteps[2].status).toBe('inactive');
    });
  });
});
