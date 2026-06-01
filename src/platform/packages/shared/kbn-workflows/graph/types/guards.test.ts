/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isAtomic,
  isDataSet,
  isElasticsearch,
  isEnterCaseBranch,
  isEnterConditionBranch,
  isEnterContinue,
  isEnterDefaultBranch,
  isEnterForeach,
  isEnterIf,
  isEnterNormalPath,
  isEnterRetry,
  isEnterStepTimeoutZone,
  isEnterSwitch,
  isEnterTryBlock,
  isEnterWhile,
  isEnterWorkflowTimeoutZone,
  isExitCaseBranch,
  isExitConditionBranch,
  isExitContinue,
  isExitDefaultBranch,
  isExitForeach,
  isExitIf,
  isExitNormalPath,
  isExitRetry,
  isExitStepTimeoutZone,
  isExitSwitch,
  isExitTryBlock,
  isExitWhile,
  isExitWorkflowTimeoutZone,
  isKibana,
  isLoopBreak,
  isLoopContinue,
  isLoopEnterNode,
  isWait,
  isWaitForInput,
  isWorkflowOutput,
  shouldSuggestInnerSteps,
} from './guards';
import type { GraphNodeUnion } from './nodes/union';

// Guards only inspect `type` and `stepType` — other GraphNodeUnion fields
// (label, edges, etc.) are omitted because they are irrelevant to guard logic.
const makeNode = (type: string, stepType = 'custom'): GraphNodeUnion =>
  ({ id: 'n1', type, stepId: 's1', stepType } as GraphNodeUnion);

describe('graph/types/guards', () => {
  describe('simple single-field guards', () => {
    it.each([
      ['isAtomic', isAtomic, 'atomic', 'wait'],
      ['isWait', isWait, 'wait', 'atomic'],
      ['isWaitForInput', isWaitForInput, 'waitForInput', 'wait'],
      ['isDataSet', isDataSet, 'data.set', 'atomic'],
      ['isWorkflowOutput', isWorkflowOutput, 'workflow.output', 'atomic'],
      ['isEnterIf', isEnterIf, 'enter-if', 'exit-if'],
      ['isExitIf', isExitIf, 'exit-if', 'enter-if'],
      [
        'isEnterConditionBranch',
        isEnterConditionBranch,
        'enter-condition-branch',
        'exit-condition-branch',
      ],
      [
        'isExitConditionBranch',
        isExitConditionBranch,
        'exit-condition-branch',
        'enter-condition-branch',
      ],
      ['isEnterForeach', isEnterForeach, 'enter-foreach', 'exit-foreach'],
      ['isExitForeach', isExitForeach, 'exit-foreach', 'enter-foreach'],
      ['isEnterWhile', isEnterWhile, 'enter-while', 'exit-while'],
      ['isExitWhile', isExitWhile, 'exit-while', 'enter-while'],
      ['isEnterRetry', isEnterRetry, 'enter-retry', 'exit-retry'],
      ['isExitRetry', isExitRetry, 'exit-retry', 'enter-retry'],
      ['isEnterContinue', isEnterContinue, 'enter-continue', 'exit-continue'],
      ['isExitContinue', isExitContinue, 'exit-continue', 'enter-continue'],
      ['isEnterTryBlock', isEnterTryBlock, 'enter-try-block', 'exit-try-block'],
      ['isExitTryBlock', isExitTryBlock, 'exit-try-block', 'enter-try-block'],
      ['isEnterNormalPath', isEnterNormalPath, 'enter-normal-path', 'exit-normal-path'],
      ['isExitNormalPath', isExitNormalPath, 'exit-normal-path', 'enter-normal-path'],
      ['isEnterSwitch', isEnterSwitch, 'enter-switch', 'exit-switch'],
      ['isExitSwitch', isExitSwitch, 'exit-switch', 'enter-switch'],
      ['isEnterCaseBranch', isEnterCaseBranch, 'enter-case-branch', 'exit-case-branch'],
      ['isExitCaseBranch', isExitCaseBranch, 'exit-case-branch', 'enter-case-branch'],
      ['isEnterDefaultBranch', isEnterDefaultBranch, 'enter-default-branch', 'exit-default-branch'],
      ['isExitDefaultBranch', isExitDefaultBranch, 'exit-default-branch', 'enter-default-branch'],
      ['isLoopBreak', isLoopBreak, 'loop-break', 'loop-continue'],
      ['isLoopContinue', isLoopContinue, 'loop-continue', 'loop-break'],
    ] as const)(
      '%s returns true for "%s" and false for "%s"',
      (_name, guard, matchType, nonMatchType) => {
        expect(guard(makeNode(matchType))).toBe(true);
        expect(guard(makeNode(nonMatchType))).toBe(false);
      }
    );
  });

  describe('prefix-based guards', () => {
    describe('isElasticsearch', () => {
      it('returns true for "elasticsearch.search"', () => {
        expect(isElasticsearch(makeNode('elasticsearch.search'))).toBe(true);
      });

      it('returns true for "elasticsearch." (trailing dot only)', () => {
        expect(isElasticsearch(makeNode('elasticsearch.'))).toBe(true);
      });

      it('returns false for "elasticsearch" (no dot)', () => {
        expect(isElasticsearch(makeNode('elasticsearch'))).toBe(false);
      });

      it('returns false for a non-elasticsearch type', () => {
        expect(isElasticsearch(makeNode('atomic'))).toBe(false);
      });
    });

    describe('isKibana', () => {
      it('returns true for "kibana.createCase"', () => {
        expect(isKibana(makeNode('kibana.createCase'))).toBe(true);
      });

      it('returns true for "kibana." (trailing dot only)', () => {
        expect(isKibana(makeNode('kibana.'))).toBe(true);
      });

      it('returns false for "kibana" (no dot)', () => {
        expect(isKibana(makeNode('kibana'))).toBe(false);
      });

      it('returns false for a non-kibana type', () => {
        expect(isKibana(makeNode('atomic'))).toBe(false);
      });
    });
  });

  describe('isLoopEnterNode', () => {
    it('returns true for enter-foreach', () => {
      expect(isLoopEnterNode(makeNode('enter-foreach'))).toBe(true);
    });

    it('returns true for enter-while', () => {
      expect(isLoopEnterNode(makeNode('enter-while'))).toBe(true);
    });

    it('returns false for enter-if', () => {
      expect(isLoopEnterNode(makeNode('enter-if'))).toBe(false);
    });

    it('returns false for exit-foreach', () => {
      expect(isLoopEnterNode(makeNode('exit-foreach'))).toBe(false);
    });
  });

  describe('timeout zone guards (dual-condition)', () => {
    describe('isEnterWorkflowTimeoutZone', () => {
      it('returns true for enter-timeout-zone with workflow_level_timeout', () => {
        expect(
          isEnterWorkflowTimeoutZone(makeNode('enter-timeout-zone', 'workflow_level_timeout'))
        ).toBe(true);
      });

      it('returns false for enter-timeout-zone with step_timeout', () => {
        expect(isEnterWorkflowTimeoutZone(makeNode('enter-timeout-zone', 'step_timeout'))).toBe(
          false
        );
      });

      it('returns false for exit-timeout-zone with workflow_level_timeout', () => {
        expect(
          isEnterWorkflowTimeoutZone(makeNode('exit-timeout-zone', 'workflow_level_timeout'))
        ).toBe(false);
      });
    });

    describe('isExitWorkflowTimeoutZone', () => {
      it('returns true for exit-timeout-zone with workflow_level_timeout', () => {
        expect(
          isExitWorkflowTimeoutZone(makeNode('exit-timeout-zone', 'workflow_level_timeout'))
        ).toBe(true);
      });

      it('returns false for exit-timeout-zone with step_timeout', () => {
        expect(isExitWorkflowTimeoutZone(makeNode('exit-timeout-zone', 'step_timeout'))).toBe(
          false
        );
      });

      it('returns false for enter-timeout-zone with workflow_level_timeout', () => {
        expect(
          isExitWorkflowTimeoutZone(makeNode('enter-timeout-zone', 'workflow_level_timeout'))
        ).toBe(false);
      });
    });

    describe('isEnterStepTimeoutZone', () => {
      it('returns true for enter-timeout-zone with step_timeout', () => {
        expect(isEnterStepTimeoutZone(makeNode('enter-timeout-zone', 'step_timeout'))).toBe(true);
      });

      it('returns false for enter-timeout-zone with workflow_level_timeout', () => {
        expect(
          isEnterStepTimeoutZone(makeNode('enter-timeout-zone', 'workflow_level_timeout'))
        ).toBe(false);
      });
    });

    describe('isExitStepTimeoutZone', () => {
      it('returns true for exit-timeout-zone with step_timeout', () => {
        expect(isExitStepTimeoutZone(makeNode('exit-timeout-zone', 'step_timeout'))).toBe(true);
      });

      it('returns false for exit-timeout-zone with workflow_level_timeout', () => {
        expect(isExitStepTimeoutZone(makeNode('exit-timeout-zone', 'workflow_level_timeout'))).toBe(
          false
        );
      });
    });
  });

  describe('shouldSuggestInnerSteps', () => {
    it('returns true only for enter-while', () => {
      expect(shouldSuggestInnerSteps(makeNode('enter-while'))).toBe(true);
    });

    it.each(['enter-foreach', 'enter-if', 'enter-switch', 'atomic'])(
      'returns false for "%s"',
      (type) => {
        expect(shouldSuggestInnerSteps(makeNode(type))).toBe(false);
      }
    );
  });
});
