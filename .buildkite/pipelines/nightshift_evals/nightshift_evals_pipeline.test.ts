/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as yamlParse } from 'yaml';
import type { NightshiftEvalTaskConfig } from './nightshift_evals_pipeline.ts';
import {
  NIGHTSHIFT_EVAL_LABEL,
  getNightshiftEvalSteps,
  getNightshiftEvalTriggerStep,
  isPreemptibleEnabled,
  parseNightshiftTasks,
} from './nightshift_evals_pipeline.ts';

type Step = Record<string, any>;

const parseSteps = (fragment: string): Step[] =>
  (yamlParse(`steps:\n${fragment}`) as { steps: Step[] }).steps;

const ORIGINAL_ENV = process.env;

describe('nightshift_evals_pipeline', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.EVAL_PREEMPTIBLE;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('getNightshiftEvalTriggerStep', () => {
    it('is null without the start label', () => {
      expect(getNightshiftEvalTriggerStep('')).toBeNull();
      expect(
        getNightshiftEvalTriggerStep('evals:smoke-tests,models:eis/openai-gpt-5.4')
      ).toBeNull();
    });

    it('matches the label exactly, not as a substring', () => {
      expect(getNightshiftEvalTriggerStep(`${NIGHTSHIFT_EVAL_LABEL}-other`)).toBeNull();
      expect(getNightshiftEvalTriggerStep(`x${NIGHTSHIFT_EVAL_LABEL}`)).toBeNull();
    });

    it('fires for the label among others', () => {
      expect(getNightshiftEvalTriggerStep(`foo, ${NIGHTSHIFT_EVAL_LABEL} ,bar`)).not.toBeNull();
    });

    it('is soft-fail, needs no Kibana build and forwards no labels', () => {
      const [step] = parseSteps(getNightshiftEvalTriggerStep(NIGHTSHIFT_EVAL_LABEL) as string);
      expect(step.soft_fail).toBe(true);
      expect(step.depends_on).toBeUndefined();
      expect(step.env).toBeUndefined();
      expect(step.command).toContain('trigger_pr.sh');
    });
  });

  describe('parseNightshiftTasks', () => {
    const FILE = `
tasks:
  ki_feature_extraction:
    args: [--dataset, orca-bench, --scenario, day-2026-04-19]
    timeoutMinutes: 240
    downloads:
      - src: gs://bucket/snapshots
        dest: snapshots/orca-bench/repository
        recursive: true
      - src: gs://bucket/manifest.json
        dest: snapshots/orca-bench/manifest.json
  other_task:
    args: []
`;

    it('reads args, downloads and timeout per task', () => {
      expect(parseNightshiftTasks(FILE)).toEqual({
        ki_feature_extraction: {
          args: ['--dataset', 'orca-bench', '--scenario', 'day-2026-04-19'],
          timeoutMinutes: 240,
          downloads: [
            {
              src: 'gs://bucket/snapshots',
              dest: 'snapshots/orca-bench/repository',
              recursive: true,
            },
            { src: 'gs://bucket/manifest.json', dest: 'snapshots/orca-bench/manifest.json' },
          ],
        },
        other_task: { args: [], downloads: [], timeoutMinutes: undefined },
      });
    });

    it.each([
      ['an empty file', ''],
      ['no tasks key', 'other: 1'],
      ['an empty tasks map', 'tasks: {}'],
      ['a task without args', 'tasks:\n  a:\n    timeoutMinutes: 5'],
      [
        'the old pr/weekly shape',
        'tasks:\n  a:\n    pr:\n      args: [--x]\n    weekly:\n      args: []',
      ],
      ['an arg with whitespace', 'tasks:\n  a:\n    args: ["--scenario x"]'],
      ['a bad task name', 'tasks:\n  "a b":\n    args: []'],
      ['a bad timeout', 'tasks:\n  a:\n    args: []\n    timeoutMinutes: 0'],
      [
        'a non-gs download',
        'tasks:\n  a:\n    args: []\n    downloads:\n      - src: https://x\n        dest: d',
      ],
      [
        'a download outside the checkout',
        'tasks:\n  a:\n    args: []\n    downloads:\n      - src: gs://b/x\n        dest: ../x',
      ],
      [
        'an absolute download dest',
        'tasks:\n  a:\n    args: []\n    downloads:\n      - src: gs://b/x\n        dest: /etc/x',
      ],
    ])('rejects %s', (_name, raw) => {
      expect(() => parseNightshiftTasks(raw)).toThrow('ci/tasks.yaml');
    });
  });

  describe('getNightshiftEvalSteps', () => {
    const TASKS: Record<string, NightshiftEvalTaskConfig> = {
      ki_feature_extraction: {
        args: ['--dataset', 'orca-bench'],
        downloads: [{ src: 'gs://bucket/x', dest: 'x' }],
        timeoutMinutes: 240,
      },
      other_task: { args: [] },
    };
    const build = (preemptible = false) =>
      parseSteps(getNightshiftEvalSteps({ tasks: TASKS, preemptible }));

    it('runs one step per task with the default model', () => {
      const [ki, other] = build();
      expect(ki.key).toBe('nightshift-evals-ki_feature_extraction');
      expect(ki.command).toContain('run_task.sh');
      expect(ki.env.NIGHTSHIFT_EVAL_TASK).toBe('ki_feature_extraction');
      expect(ki.env.NIGHTSHIFT_EVAL_CONNECTOR_ID).toBe('');
      expect(ki.env.NIGHTSHIFT_EVAL_ARGS).toBe('--dataset orca-bench');
      expect(JSON.parse(ki.env.NIGHTSHIFT_EVAL_DOWNLOADS)).toEqual(
        TASKS.ki_feature_extraction.downloads
      );
      expect(ki.timeout_in_minutes).toBe(240);
      // The EIS key and the Vault config the run needs.
      expect(ki.env.KBN_EVALS).toBe('1');
      expect(ki.env.FTR_EIS_CCM).toBe('1');

      expect(other.env.NIGHTSHIFT_EVAL_ARGS).toBe('');
      expect(JSON.parse(other.env.NIGHTSHIFT_EVAL_DOWNLOADS)).toEqual([]);
      expect(other.timeout_in_minutes).toBe(90);
    });

    it('uses preemptible agents only when asked', () => {
      const [plain] = build(false);
      expect(plain.agents.preemptible).toBeUndefined();
      expect(plain.retry.automatic).toEqual([{ exit_status: '*', limit: 1 }]);

      const [spot] = build(true);
      expect(spot.agents.preemptible).toBe(true);
      expect(spot.retry.automatic).toEqual([
        { exit_status: '-1', limit: 3 },
        { exit_status: '*', limit: 1 },
      ]);
    });

    it('posts the PR comment after every run, even when one failed', () => {
      const steps = build();
      const comment = steps[steps.length - 1];
      expect(comment.command).toContain('post_pr_comment.sh');
      expect(comment.depends_on).toEqual([
        'nightshift-evals-ki_feature_extraction',
        'nightshift-evals-other_task',
      ]);
      expect(comment.allow_dependency_failure).toBe(true);
      expect(comment.env.NIGHTSHIFT_EVAL_TASKS).toBe('ki_feature_extraction,other_task');
    });
  });

  describe('isPreemptibleEnabled', () => {
    it.each([
      [undefined, true],
      ['1', true],
      ['0', false],
      ['false', false],
      [' No ', false],
    ])('EVAL_PREEMPTIBLE=%p -> %p', (value, expected) => {
      if (value === undefined) {
        delete process.env.EVAL_PREEMPTIBLE;
      } else {
        process.env.EVAL_PREEMPTIBLE = value;
      }
      expect(isPreemptibleEnabled()).toBe(expected);
    });
  });
});
