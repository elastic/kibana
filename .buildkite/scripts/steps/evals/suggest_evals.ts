/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { basename } from 'node:path';
import type { EvalsSuiteMetadataEntry } from '../../../pipelines/evals/eval_pipeline.ts';
import {
  getForwardablePrLabelList,
  readEvalsSuiteMetadata,
} from '../../../pipelines/evals/eval_pipeline.ts';
import type { ChangedFile } from '../../../pipelines/evals/evals_suggestions.ts';
import { getEvalSuggestions } from '../../../pipelines/evals/evals_suggestions.ts';
import {
  EVALS_SUGGESTIONS_CONTEXT,
  NO_SUGGESTIONS_BODY,
  renderEvalSuggestionsComment,
} from '../../../pipelines/evals/evals_suggestions_comment.ts';
import { listSkillDirs } from '../../../pipelines/evals/skill_dirs.ts';
import { EVALS_SUGGESTIONS_LABEL } from '../../../pipeline-utils/step-library/steps/evals_suggestions.ts';
import { BuildkiteClient, getPrChangesCached, upsertComment } from '#pipeline-utils';

/**
 * The labels the evals child build actually receives. Labels the trigger cannot forward (whitespace
 * or `=`) never reach it, so counting them would report a run that never happens.
 */
export const getSuggestionLabels = (githubPrLabels: string): string[] =>
  getForwardablePrLabelList(githubPrLabels);

export type SuggestionsMode = 'dry-run' | 'comment';

/** Anything but an explicit `comment` stays a dry run, so a typo cannot start commenting. */
export const resolveSuggestionsMode = (value: string | undefined): SuggestionsMode =>
  value === 'comment' ? 'comment' : 'dry-run';

interface RunSuggestEvalsArgs {
  changes: ChangedFile[];
  suites: EvalsSuiteMetadataEntry[];
  labels: string[];
  skillDirs?: readonly string[];
  /** The PR target branch, so the prompt can show the diff against it. */
  baseBranch?: string;
  mode: SuggestionsMode;
  upsert: typeof upsertComment;
  annotate: (markdown: string) => void;
}

/** Advisory: logs and returns on any failure so it can never fail the build. */
export const runSuggestEvals = async ({
  changes,
  suites,
  labels,
  skillDirs,
  baseBranch,
  mode: requestedMode,
  upsert,
  annotate,
}: RunSuggestEvalsArgs): Promise<void> => {
  try {
    const body = renderEvalSuggestionsComment(
      getEvalSuggestions({ changes, suites, labels, skillDirs }),
      {
        baseBranch,
      }
    );

    // A comment is only ever posted on a PR that opted in with the label, whatever the mode says.
    const isOptedIn = labels.includes(EVALS_SUGGESTIONS_LABEL);
    const mode: SuggestionsMode = requestedMode === 'comment' && isOptedIn ? 'comment' : 'dry-run';
    if (requestedMode === 'comment' && mode === 'dry-run') {
      console.log(
        `Not commenting: the PR does not have the ${EVALS_SUGGESTIONS_LABEL} label; doing a dry run instead.`
      );
    }

    if (mode === 'dry-run') {
      if (body === null) {
        console.log('[dry-run] No eval suggestions for this PR; nothing would be posted.');
        return;
      }
      console.log(`[dry-run] Would post this comment:\n\n${body}`);
      annotate(`**Dry run: not posted to the PR.**\n\n${body}`);
      return;
    }

    if (body === null) {
      // Clear stale advice from an earlier push, but never create a comment just to say nothing.
      await upsert({
        commentBody: NO_SUGGESTIONS_BODY,
        commentContext: EVALS_SUGGESTIONS_CONTEXT,
        clearPrevious: false,
        createIfMissing: false,
      });
      return;
    }

    await upsert({
      commentBody: body,
      commentContext: EVALS_SUGGESTIONS_CONTEXT,
      clearPrevious: false,
    });
  } catch (error) {
    console.error('Could not post evals suggestions:', error);
  }
};

export const main = async (): Promise<void> => {
  try {
    await runSuggestEvals({
      changes: await getPrChangesCached(),
      suites: readEvalsSuiteMetadata(),
      labels: getSuggestionLabels(process.env.GITHUB_PR_LABELS ?? ''),
      skillDirs: listSkillDirs(),
      mode: resolveSuggestionsMode(process.env.EVALS_SUGGESTIONS_MODE),
      baseBranch: process.env.GITHUB_PR_TARGET_BRANCH,
      upsert: upsertComment,
      annotate: (markdown) =>
        new BuildkiteClient().setAnnotation(EVALS_SUGGESTIONS_CONTEXT, 'info', markdown),
    });
  } catch (error) {
    console.error('Could not prepare evals suggestions:', error);
  }
};

if (basename(process.argv[1] ?? '') === 'suggest_evals.ts') {
  main();
}
