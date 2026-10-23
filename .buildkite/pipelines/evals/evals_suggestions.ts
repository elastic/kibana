/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { minimatch } from 'minimatch';
import type { EvalsSuiteMetadataEntry } from './eval_pipeline.ts';
import { getSuiteRunState, hasRunnableModelSelection } from './eval_pipeline.ts';
import { isLlmContentPath } from './llm_change_patterns.ts';
import { hasDotSegment, toSkillDirs } from './skill_dirs.ts';

export interface ChangedFile {
  filename: string;
  previous_filename?: string;
}

export interface EvalSuggestion {
  suiteId: string;
  suiteName: string;
  /** Where the suite's Playwright config lives, for pointing a developer at it. */
  configPath?: string;
  status: 'suggested' | 'selected-will-run' | 'selected-needs-models';
  /** Every changed path that matched, in PR order; the renderer truncates. */
  matchedFiles: string[];
  /** The `evals:<id>` label to add; empty once the suite is already selected. */
  labelsToAdd: string[];
  needsModelLabel: boolean;
}

export interface EvalSuggestionResult {
  suggestions: EvalSuggestion[];
  overflow: EvalSuggestion[];
  /**
   * Changed files that look like LLM-facing content but match no suite's mapping. This is about the
   * mapping, not about coverage: a suite may exist that simply is not mapped to these files yet.
   */
  unmappedLlmFiles: string[];
}

const MAX_SUGGESTIONS = 3;

// Mirrors `areChangesSkippable`: the GitHub files API stops at 3000, so a PR this large is only
// partially visible and any suggestion would be a guess.
const MAX_ANALYZABLE_CHANGES = 3000;

const GLOB_OPTIONS = { dot: true } as const;

// Never evidence that LLM behavior changed, anywhere (including a suite's own package).
const ALWAYS_EXCLUDED = ['**/*.test.{ts,tsx}', '**/__snapshots__/**', '**/__mocks__/**'];

// Documentation, except the markdown the skill loader reads at runtime (see `isRuntimeSkillMarkdown`).
const MARKDOWN = '**/*.md';

// Production skills are registered from a `server/skills` tree.
const SERVER_SKILLS_SEGMENT = '/server/skills/';

/**
 * Whether `path` is markdown the skill loader consumes at runtime: a `.md` file beneath a skill
 * directory (one holding a `SKILL.md`) in a `server/skills` tree, outside any dot-prefixed path.
 * Group-level READMEs, ordinary documentation and developer skills under `.claude/` stay documentation.
 */
const isRuntimeSkillMarkdown = (path: string, skillDirs: ReadonlySet<string>): boolean =>
  path.endsWith('.md') &&
  !hasDotSegment(path) &&
  `/${path}`.includes(SERVER_SKILLS_SEGMENT) &&
  [...skillDirs].some((dir) => path.startsWith(`${dir}/`));

// Test code outside a suite's own package. Inside it, specs and test inputs are what a dev edits to
// change the evals, so they stay.
const EXCLUDED_OUTSIDE_OWN_PACKAGE = [
  '**/*.spec.{ts,tsx}',
  '**/__tests__/**',
  '**/integration_tests/**',
];

const matchesAny = (path: string, globs: readonly string[] = []): boolean =>
  globs.some((glob) => minimatch(path, glob, GLOB_OPTIONS));

const getConfigDir = (suite: EvalsSuiteMetadataEntry): string | undefined =>
  suite.configPath ? Path.dirname(suite.configPath) : undefined;

const getSharedConfigDirs = (suites: EvalsSuiteMetadataEntry[]): Set<string> => {
  const counts = new Map<string, number>();
  for (const dir of suites.map(getConfigDir)) {
    if (dir) counts.set(dir, (counts.get(dir) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([dir]) => dir));
};

/**
 * Whether the suite names this markdown file as runtime content: a `coverage.include` glob that
 * itself ends in `.md` and matches. A broad glob such as `pkg/**` never qualifies, so ordinary
 * documentation stays excluded unless a suite says otherwise.
 */
const declaresMarkdown = (path: string, suite: EvalsSuiteMetadataEntry): boolean =>
  matchesAny(
    path,
    (suite.coverage?.include ?? []).filter((glob) => glob.endsWith('.md'))
  );

const isSuiteChange = (
  path: string,
  suite: EvalsSuiteMetadataEntry,
  sharedConfigDirs: Set<string>,
  skillDirs: ReadonlySet<string>
): boolean => {
  const isDocumentation =
    matchesAny(path, [MARKDOWN]) &&
    !isRuntimeSkillMarkdown(path, skillDirs) &&
    !declaresMarkdown(path, suite);
  if (isDocumentation || matchesAny(path, ALWAYS_EXCLUDED)) {
    return false;
  }

  // An explicit exclude beats both ways of matching, including the own-package one.
  if (matchesAny(path, suite.coverage?.exclude)) {
    return false;
  }

  const configDir = getConfigDir(suite);
  const isInOwnPackage = configDir !== undefined && path.startsWith(`${configDir}/`);
  const isCovered = matchesAny(path, suite.coverage?.include);
  // A directory shared by several suites cannot say which of them a file belongs to, so only the
  // files a suite names itself count there.
  const isOwnPackageMatch =
    isInOwnPackage && configDir !== undefined && !sharedConfigDirs.has(configDir);

  if (!isCovered && !isOwnPackageMatch) {
    return false;
  }

  return isInOwnPackage || !matchesAny(path, EXCLUDED_OUTSIDE_OWN_PACKAGE);
};

/** Maps a PR's changed files and labels to the eval suites worth running. Pure. */
export const getEvalSuggestions = ({
  changes,
  suites,
  labels,
  skillDirs = [],
}: {
  changes: ChangedFile[];
  suites: EvalsSuiteMetadataEntry[];
  labels: string[];
  /** Skill directories in the checkout; those of changed `SKILL.md` files are added automatically. */
  skillDirs?: readonly string[];
}): EvalSuggestionResult => {
  if (changes.length >= MAX_ANALYZABLE_CHANGES) {
    return { suggestions: [], overflow: [], unmappedLlmFiles: [] };
  }

  const sharedConfigDirs = getSharedConfigDirs(suites);
  const changedPaths = changes.flatMap(({ filename, previous_filename: previous }) =>
    previous ? [filename, previous] : [filename]
  );
  // A changed SKILL.md proves its directory is a skill even if it is new, or gone from the checkout.
  const knownSkillDirs = new Set([...skillDirs, ...toSkillDirs(changedPaths)]);

  const all = suites.flatMap((suite): EvalSuggestion[] => {
    const state = getSuiteRunState(labels, suite);
    if (state === 'skipped') {
      return [];
    }

    const matchedFiles = [
      ...new Set(
        changedPaths.filter((path) => isSuiteChange(path, suite, sharedConfigDirs, knownSkillDirs))
      ),
    ];
    if (matchedFiles.length === 0) {
      return [];
    }

    const [firstLabel] = suite.ciLabels?.length ? suite.ciLabels : [`evals:${suite.id}`];
    const isSuggested = state === 'not-selected';

    return [
      {
        suiteId: suite.id,
        suiteName: suite.name ?? suite.id,
        configPath: suite.configPath,
        status: isSuggested ? 'suggested' : state,
        matchedFiles,
        labelsToAdd: isSuggested ? [firstLabel] : [],
        needsModelLabel: !hasRunnableModelSelection(labels, suite),
      },
    ];
  });

  const ordered = [
    ...all.filter(({ status }) => status === 'suggested'),
    ...all.filter(({ status }) => status !== 'suggested'),
  ];

  const isMapped = (path: string): boolean =>
    suites.some((suite) => isSuiteChange(path, suite, sharedConfigDirs, knownSkillDirs));
  const unmappedLlmFiles = [
    ...new Set(
      changedPaths.filter(
        (path) =>
          (isLlmContentPath(path) || isRuntimeSkillMarkdown(path, knownSkillDirs)) &&
          !isMapped(path)
      )
    ),
  ];

  return {
    suggestions: ordered.slice(0, MAX_SUGGESTIONS),
    overflow: ordered.slice(MAX_SUGGESTIONS),
    unmappedLlmFiles,
  };
};
