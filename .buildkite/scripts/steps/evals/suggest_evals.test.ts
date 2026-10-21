/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EvalsSuiteMetadataEntry } from '../../../pipelines/evals/eval_pipeline.ts';
import { NO_SUGGESTIONS_BODY } from '../../../pipelines/evals/evals_suggestions_comment.ts';
import { EVALS_SUGGESTIONS_LABEL } from '../../../pipeline-utils/step-library/steps/evals_suggestions.ts';
import { getSuggestionLabels, resolveSuggestionsMode, runSuggestEvals } from './suggest_evals.ts';

jest.mock('#pipeline-utils', () => ({
  upsertComment: jest.fn(),
  getPrChangesCached: jest.fn(),
  BuildkiteClient: jest.fn(),
}));

const SUITES: EvalsSuiteMetadataEntry[] = [
  {
    id: 'agent-builder',
    name: 'Agent Builder',
    ciLabels: ['evals:agent-builder'],
    configPath: 'pkg/ab/playwright.config.ts',
    coverage: { include: ['plugin/ab/server/**'] },
  },
];

// Opting in with this label is what allows a comment on a PR.
const OPT_IN = EVALS_SUGGESTIONS_LABEL;

const MATCHING = [{ filename: 'plugin/ab/server/prompt.ts' }];
const UNRELATED = [{ filename: 'src/other/file.ts' }];

describe('suggest_evals', () => {
  const upsert = jest.fn();
  const annotate = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const run = (changes: Array<{ filename: string }>, mode: 'dry-run' | 'comment') =>
    runSuggestEvals({
      changes,
      suites: SUITES,
      labels: [OPT_IN],
      mode,
      upsert,
      annotate,
    });

  describe('in comment mode', () => {
    it('edits the sticky comment in place when a suite matches', async () => {
      await run(MATCHING, 'comment');

      expect(upsert).toHaveBeenCalledTimes(1);
      expect(upsert).toHaveBeenCalledWith({
        commentBody: expect.stringContaining('**Agent Builder** (`agent-builder`)'),
        commentContext: 'evals-suggestions',
        clearPrevious: false,
      });
      expect(annotate).not.toHaveBeenCalled();
    });

    it('only updates an existing comment, never creates one, when nothing matches', async () => {
      await run(UNRELATED, 'comment');

      expect(upsert).toHaveBeenCalledTimes(1);
      expect(upsert).toHaveBeenCalledWith({
        commentBody: NO_SUGGESTIONS_BODY,
        commentContext: 'evals-suggestions',
        clearPrevious: false,
        createIfMissing: false,
      });
    });
  });

  describe('the opt-in label', () => {
    const runWith = (labels: string[], changes = MATCHING) =>
      runSuggestEvals({
        changes,
        suites: SUITES,
        labels,
        mode: 'comment',
        upsert,
        annotate,
      });

    it('is the documented label name', () => {
      expect(EVALS_SUGGESTIONS_LABEL).toBe('ci:evals-suggestions');
    });

    it('allows a comment when it is present among other labels', async () => {
      await runWith(['Team:Foo', OPT_IN, 'release_note:skip']);

      expect(upsert).toHaveBeenCalledTimes(1);
      expect(annotate).not.toHaveBeenCalled();
    });

    it.each([
      ['no labels', []],
      ['only unrelated labels', ['Team:Foo', 'evals:agent-builder']],
      ['a similar but different label', ['ci:evals-suggestions-later']],
    ])('never comments with %s, and only annotates the build instead', async (_name, labels) => {
      await runWith(labels);

      expect(upsert).not.toHaveBeenCalled();
      expect(annotate).toHaveBeenCalledTimes(1);
    });

    it('does not even clear a comment when the label is missing', async () => {
      await runWith([], UNRELATED);

      expect(upsert).not.toHaveBeenCalled();
    });
  });

  describe('in dry-run mode', () => {
    it('annotates the build with the comment it would post and posts nothing', async () => {
      await run(MATCHING, 'dry-run');

      expect(annotate).toHaveBeenCalledTimes(1);
      expect(annotate).toHaveBeenCalledWith(expect.stringContaining('**Agent Builder**'));
      expect(upsert).not.toHaveBeenCalled();
    });

    it('does nothing when nothing matches', async () => {
      await run(UNRELATED, 'dry-run');

      expect(annotate).not.toHaveBeenCalled();
      expect(upsert).not.toHaveBeenCalled();
    });
  });

  it('recognises runtime skill markdown through the skill directories it is given', async () => {
    const skillSuites: EvalsSuiteMetadataEntry[] = [
      { ...SUITES[0], coverage: { include: ['plugin/platform/server/**'] } },
    ];

    await runSuggestEvals({
      changes: [{ filename: 'plugin/platform/server/skills/group/one/reference.md' }],
      suites: skillSuites,
      labels: [OPT_IN],
      skillDirs: ['plugin/platform/server/skills/group/one'],
      mode: 'comment',
      upsert,
      annotate,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ commentBody: expect.stringContaining('**Agent Builder**') })
    );
  });

  it('uses the PR target branch in the diff command of the prompt', async () => {
    await runSuggestEvals({
      changes: [{ filename: 'plugin/o/skills/a/a.skill.md.text' }],
      suites: SUITES,
      labels: [OPT_IN],
      baseBranch: '9.4',
      mode: 'comment',
      upsert,
      annotate,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ commentBody: expect.stringContaining('origin/9.4)') })
    );
  });

  it('never fails the build when posting throws', async () => {
    upsert.mockRejectedValue(new Error('GitHub is down'));

    await expect(run(MATCHING, 'comment')).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('evals suggestions'),
      expect.any(Error)
    );
  });

  describe('resolveSuggestionsMode', () => {
    it.each([
      [undefined, 'dry-run'],
      ['', 'dry-run'],
      ['dry-run', 'dry-run'],
      ['comment', 'comment'],
      ['nonsense', 'dry-run'],
    ])('maps EVALS_SUGGESTIONS_MODE=%j to %s', (value, expected) => {
      expect(resolveSuggestionsMode(value)).toBe(expected);
    });
  });

  describe('getSuggestionLabels', () => {
    it('drops the labels the evals trigger cannot forward', () => {
      expect(
        getSuggestionLabels(
          'evals:agent-builder,models:gpt 5,models:foo=bar,models:eis/openai-gpt-5.4'
        )
      ).toEqual(['evals:agent-builder', 'models:eis/openai-gpt-5.4']);
    });

    it('accepts the JSON array form and an empty value', () => {
      expect(getSuggestionLabels('["evals:ml","models:x"]')).toEqual(['evals:ml', 'models:x']);
      expect(getSuggestionLabels('')).toEqual([]);
    });

    it('reports a suite as needing models when its only models label would be dropped', async () => {
      await runSuggestEvals({
        changes: MATCHING,
        suites: SUITES,
        labels: getSuggestionLabels(`${OPT_IN},evals:agent-builder,models:gpt 5`),
        mode: 'comment',
        upsert,
        annotate,
      });

      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          commentBody: expect.stringContaining('Selected but will not run'),
        })
      );
    });
  });
});
