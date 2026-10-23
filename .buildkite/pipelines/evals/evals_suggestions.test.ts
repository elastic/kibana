/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EvalsSuiteMetadataEntry } from './eval_pipeline.ts';
import type { ChangedFile } from './evals_suggestions.ts';
import { getEvalSuggestions } from './evals_suggestions.ts';

const SUITES: EvalsSuiteMetadataEntry[] = [
  {
    id: 'agent-builder',
    ciLabels: ['evals:agent-builder'],
    configPath: 'pkg/ab/playwright.config.ts',
    coverage: {
      include: ['plugin/ab/server/**', 'pkg/ab/evals/**'],
      exclude: ['pkg/ab/evals/esql/**'],
    },
  },
  {
    id: 'esql-generation',
    ciLabels: ['evals:esql-generation'],
    configPath: 'pkg/ab/esql.playwright.config.ts',
    coverage: { include: ['pkg/genai/generate_esql/**', 'pkg/ab/evals/esql/**'] },
  },
  {
    id: 'ml',
    ciLabels: ['evals:ml'],
    configPath: 'plugin/ml/evals/playwright.config.ts',
    coverage: { include: ['plugin/ml/server/agent_builder/**'] },
  },
  {
    id: 'smoke-tests',
    ciLabels: ['evals:smoke-tests'],
    configPath: 'pkg/smoke/playwright.config.ts',
    defaultModelGroups: ['eis/haiku'],
  },
];

const files = (...names: string[]): ChangedFile[] => names.map((filename) => ({ filename }));

const suggestedIds = (changes: ChangedFile[], labels: string[] = [], suites = SUITES) =>
  getEvalSuggestions({ changes, suites, labels }).suggestions.map(({ suiteId }) => suiteId);

describe('getEvalSuggestions', () => {
  describe('matching changed files to suites', () => {
    it.each([
      ['a covered prompt file', ['plugin/ab/server/prompts/system_prompt.ts'], ['agent-builder']],
      ['a covered file that is only docs', ['plugin/ab/server/README.md'], []],
      ['a covered .test.ts file', ['plugin/ab/server/foo.test.ts'], []],
      ['a covered .test.tsx file', ['plugin/ab/server/foo.test.tsx'], []],
      ['a covered snapshot', ['plugin/ab/server/__snapshots__/foo.snap'], []],
      ['a covered mock', ['plugin/ab/server/__mocks__/foo.ts'], []],
      ['a covered integration test dir', ['plugin/ab/server/integration_tests/foo.ts'], []],
      ['a covered __tests__ dir', ['plugin/ab/server/__tests__/foo.ts'], []],
      ['a covered .spec.ts outside the own package', ['plugin/ab/server/foo.spec.ts'], []],
      ['an unrelated file', ['src/other/file.ts'], []],
      ['a spec in the shared own dir', ['pkg/ab/evals/kb/kb.spec.ts'], ['agent-builder']],
      ['a spec in the esql subdir', ['pkg/ab/evals/esql/esql.spec.ts'], ['esql-generation']],
      ['a file in the shared dir with no coverage', ['pkg/ab/src/random.ts'], []],
      ['a .test.ts in the shared own dir', ['pkg/ab/evals/kb/helper.test.ts'], []],
      ['any non-test file in a non-shared own dir', ['plugin/ml/evals/anything.ts'], ['ml']],
      ['a spec in a non-shared own dir', ['plugin/ml/evals/routing.spec.ts'], ['ml']],
      ['a fixture in a non-shared own dir', ['plugin/ml/evals/x_fixtures.ts'], ['ml']],
      ['docs in a non-shared own dir', ['plugin/ml/evals/README.md'], []],
      ['a .test.ts in a non-shared own dir', ['plugin/ml/evals/x.test.ts'], []],
      [
        'a covered file of a suite with defaults',
        ['pkg/smoke/evals/test.spec.ts'],
        ['smoke-tests'],
      ],
      [
        'files of two suites',
        ['plugin/ab/server/a.ts', 'pkg/genai/generate_esql/p.ts'],
        ['agent-builder', 'esql-generation'],
      ],
    ])('handles %s', (_name, names, expected) => {
      expect(suggestedIds(files(...names))).toEqual(expected);
    });

    it('matches a rename through its previous filename and reports that path', () => {
      const { suggestions } = getEvalSuggestions({
        changes: [{ filename: 'new/place.ts', previous_filename: 'plugin/ab/server/p.ts' }],
        suites: SUITES,
        labels: [],
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toMatchObject({
        suiteId: 'agent-builder',
        matchedFiles: ['plugin/ab/server/p.ts'],
      });
    });

    it('lists every matched file once', () => {
      const { suggestions } = getEvalSuggestions({
        changes: files('plugin/ab/server/a.ts', 'plugin/ab/server/b.ts', 'src/other.ts'),
        suites: SUITES,
        labels: [],
      });

      expect(suggestions[0].matchedFiles).toEqual([
        'plugin/ab/server/a.ts',
        'plugin/ab/server/b.ts',
      ]);
    });

    it('returns nothing for a PR too large to analyze', () => {
      const changes = files(
        ...Array.from({ length: 3000 }, (_, index) => `plugin/ab/server/f${index}.ts`)
      );

      expect(getEvalSuggestions({ changes, suites: SUITES, labels: [] })).toEqual({
        suggestions: [],
        overflow: [],
        unmappedLlmFiles: [],
      });
    });
  });

  describe('explicit coverage excludes', () => {
    const suites: EvalsSuiteMetadataEntry[] = [
      {
        id: 'ml',
        ciLabels: ['evals:ml'],
        configPath: 'plugin/ml/evals/playwright.config.ts',
        coverage: {
          include: ['plugin/ml/server/agent_builder/**'],
          exclude: ['plugin/ml/evals/other_suite/**', 'plugin/ml/server/agent_builder/legacy/**'],
        },
      },
    ];

    it.each([
      ['an excluded file inside a non-shared own package', 'plugin/ml/evals/other_suite/a.ts', []],
      ['an excluded covered file', 'plugin/ml/server/agent_builder/legacy/a.ts', []],
      ['a non-excluded file inside the own package', 'plugin/ml/evals/routing.spec.ts', ['ml']],
      ['a non-excluded covered file', 'plugin/ml/server/agent_builder/tools/a.ts', ['ml']],
    ])('handles %s', (_name, filename, expected) => {
      expect(suggestedIds(files(filename), [], suites)).toEqual(expected);
    });
  });

  describe('markdown a suite declares as runtime content', () => {
    // Some prompt content is plain markdown (for example documentation the model reads), which a
    // path rule cannot tell from ordinary docs, so a suite names it with a glob that ends in `.md`.
    const suites: EvalsSuiteMetadataEntry[] = [
      {
        id: 'esql-generation',
        ciLabels: ['evals:esql-generation'],
        configPath: 'pkg/esql/playwright.config.ts',
        coverage: { include: ['pkg/generate_esql/**', 'pkg/generate_esql/documentation/*.md'] },
      },
      {
        id: 'other',
        ciLabels: ['evals:other'],
        configPath: 'pkg/other/playwright.config.ts',
        coverage: { include: ['pkg/other/**'] },
      },
    ];
    const suggestedFor = (filename: string) => suggestedIds(files(filename), [], suites);

    it.each([
      [
        'a markdown file the suite names explicitly',
        'pkg/generate_esql/documentation/syntax.md',
        ['esql-generation'],
      ],
      ['a markdown file the explicit glob does not name', 'pkg/generate_esql/README.md', []],
      [
        'a nested markdown file the explicit glob does not reach',
        'pkg/generate_esql/documentation/deep/a.md',
        [],
      ],
      ['markdown under a suite that only has a broad glob', 'pkg/other/README.md', []],
      [
        'a non-markdown file under the broad glob',
        'pkg/generate_esql/prompts.ts',
        ['esql-generation'],
      ],
    ])('handles %s', (_name, filename, expected) => {
      expect(suggestedFor(filename)).toEqual(expected);
    });

    it('does not let one suite markdown glob make the file eligible for another suite', () => {
      const both: EvalsSuiteMetadataEntry[] = [
        ...suites,
        {
          ...suites[1],
          id: 'third',
          ciLabels: ['evals:third'],
          configPath: 'pkg/third/p.ts',
          coverage: { include: ['pkg/**'] },
        },
      ];

      expect(suggestedIds(files('pkg/generate_esql/documentation/syntax.md'), [], both)).toEqual([
        'esql-generation',
      ]);
    });

    it('still honors an explicit exclude', () => {
      const excluded: EvalsSuiteMetadataEntry[] = [
        {
          ...suites[0],
          coverage: {
            include: ['pkg/generate_esql/documentation/*.md'],
            exclude: ['pkg/generate_esql/documentation/syntax.md'],
          },
        },
      ];

      expect(
        suggestedIds(files('pkg/generate_esql/documentation/syntax.md'), [], excluded)
      ).toEqual([]);
    });
  });

  describe('runtime skill markdown', () => {
    // The skill loader reads SKILL.md and every other .md under a skill directory as runtime content.
    const SKILLS = 'plugin/platform/server/skills';
    const skillDir = `${SKILLS}/elastic-skills/context-engine`;
    const suites: EvalsSuiteMetadataEntry[] = [
      {
        id: 'agent-builder',
        ciLabels: ['evals:agent-builder'],
        configPath: 'pkg/ab/playwright.config.ts',
        coverage: { include: ['plugin/platform/server/**'] },
      },
    ];
    const suggestedFor = (filename: string, skillDirs: string[] = [skillDir]) =>
      getEvalSuggestions({
        changes: files(filename),
        suites,
        labels: [],
        skillDirs,
      }).suggestions.map(({ suiteId }) => suiteId);

    it.each([
      ['a SKILL.md', `${skillDir}/SKILL.md`, [skillDir], ['agent-builder']],
      ['a referenced file next to it', `${skillDir}/reference.md`, [skillDir], ['agent-builder']],
      [
        'a referenced file in a subdirectory',
        `${skillDir}/refs/deep/api.md`,
        [skillDir],
        ['agent-builder'],
      ],
      ['the README of the skills group', `${SKILLS}/elastic-skills/README.md`, [skillDir], []],
      ['markdown in a directory that is not a skill', `${SKILLS}/other/NOTES.md`, [skillDir], []],
      [
        'markdown in a dot-prefixed directory of a skill',
        `${skillDir}/.hidden/notes.md`,
        [skillDir],
        [],
      ],
      ['a dot-prefixed markdown file of a skill', `${skillDir}/.notes.md`, [skillDir], []],
      ['ordinary plugin documentation', 'plugin/platform/server/README.md', [skillDir], []],
      [
        'a skill outside a server/skills tree',
        'plugin/platform/test/skills/test-skill/SKILL.md',
        [],
        [],
      ],
      [
        'a developer skill under .claude',
        'plugin/platform/server/.claude/skills/x/SKILL.md',
        [],
        [],
      ],
      [
        'a developer skill under .agents',
        'plugin/platform/server/.agents/skills/x/SKILL.md',
        [],
        [],
      ],
    ])('handles %s', (_name, filename, skillDirs, expected) => {
      expect(suggestedFor(filename, skillDirs)).toEqual(expected);
    });

    it('treats a changed SKILL.md as proof of a skill directory, so a new skill is recognised', () => {
      const { suggestions } = getEvalSuggestions({
        changes: files(`${SKILLS}/new/SKILL.md`, `${SKILLS}/new/reference.md`),
        suites,
        labels: [],
        skillDirs: [],
      });

      expect(suggestions[0].matchedFiles).toEqual([
        `${SKILLS}/new/SKILL.md`,
        `${SKILLS}/new/reference.md`,
      ]);
    });

    it('makes the file eligible without mapping it to a suite', () => {
      const unmapped: EvalsSuiteMetadataEntry[] = [
        { ...suites[0], coverage: { include: ['somewhere/else/**'] } },
      ];

      expect(
        getEvalSuggestions({
          changes: files(`${skillDir}/SKILL.md`),
          suites: unmapped,
          labels: [],
          skillDirs: [skillDir],
        }).suggestions
      ).toEqual([]);
    });

    it('still honors an explicit coverage exclude', () => {
      const excluded: EvalsSuiteMetadataEntry[] = [
        {
          ...suites[0],
          coverage: { include: ['plugin/platform/server/**'], exclude: [`${skillDir}/**`] },
        },
      ];

      expect(
        getEvalSuggestions({
          changes: files(`${skillDir}/SKILL.md`),
          suites: excluded,
          labels: [],
          skillDirs: [skillDir],
        }).suggestions
      ).toEqual([]);
    });

    it('keeps ignoring markdown when no skill directories are known', () => {
      expect(
        getEvalSuggestions({
          changes: files('plugin/platform/server/README.md'),
          suites,
          labels: [],
        }).suggestions
      ).toEqual([]);
    });
  });

  describe('LLM-related files with no suite mapping', () => {
    const unmapped = (names: string[], labels: string[] = [], skillDirs: string[] = []) =>
      getEvalSuggestions({ changes: files(...names), suites: SUITES, labels, skillDirs })
        .unmappedLlmFiles;

    it.each([
      ['a skill written as text', 'plugin/other/server/skills/ki/ki.skill.md.text'],
      [
        'agent instructions written as text',
        'plugin/other/agents/discovery/instructions/discovery.md.text',
      ],
      ['a TypeScript skill', 'plugin/cases/server/agent_builder/skills/cases_skill.ts'],
      ['a prompt module', 'plugin/viz/server/shared/data_discovery_prompt.ts'],
      ['a prompts module', 'plugin/assistant/server/lib/prompt/prompts.ts'],
      ['a file in a prompts folder', 'plugin/inference/nl_to_esql/prompts/syntax.txt'],
    ])('flags %s', (_name, file) => {
      expect(unmapped([file])).toEqual([file]);
    });

    it.each([
      ['a developer skill under .agents', 'plugin/x/.agents/skills/kbn-github/SKILL.md'],
      ['a developer skill under .claude', 'plugin/x/.claude/skills/a/SKILL.md'],
      ['a UI prompts component', 'plugin/x/public/application/components/prompts/empty_prompt.tsx'],
      ['a UI file named like a prompt', 'plugin/x/public/components/awaiting_prompt.ts'],
      [
        'a dataset of eval prompts',
        'pkg/kbn-evals-suite-foo/src/datasets/persona_matrix_prompts.ts',
      ],
      ['an eval spec', 'plugin/x/evals/routing_prompts.ts'],
      ['a test for a prompt', 'plugin/x/server/prompts.test.ts'],
      ['ordinary documentation', 'plugin/x/server/README.md'],
      ['plain application code', 'plugin/x/server/routes/tools.ts'],
    ])('does not flag %s', (_name, file) => {
      expect(unmapped([file])).toEqual([]);
    });

    it('flags runtime skill markdown when its directory is a known skill', () => {
      const dir = 'plugin/x/server/skills/group/one';

      expect(unmapped([`${dir}/SKILL.md`, `${dir}/ref.md`], [], [dir])).toEqual([
        `${dir}/SKILL.md`,
        `${dir}/ref.md`,
      ]);
    });

    it('does not flag a file that a suite maps, even when its suite has a skip label', () => {
      const mapped = 'plugin/ab/server/prompts/system_prompt.ts';

      expect(unmapped([mapped])).toEqual([]);
      expect(unmapped([mapped], ['evals:skip-agent-builder'])).toEqual([]);
    });

    it('lists only the unmapped files when a PR changes mapped and unmapped ones', () => {
      expect(
        unmapped([
          'plugin/ab/server/prompts/system_prompt.ts',
          'plugin/other/skills/a/a.skill.md.text',
        ])
      ).toEqual(['plugin/other/skills/a/a.skill.md.text']);
    });

    it('lists a renamed file once, under its new and old names when both look like LLM content', () => {
      const result = getEvalSuggestions({
        changes: [
          {
            filename: 'plugin/o/skills/b/b.skill.md.text',
            previous_filename: 'plugin/o/skills/a/a.skill.md.text',
          },
        ],
        suites: SUITES,
        labels: [],
      });

      expect(result.unmappedLlmFiles).toEqual([
        'plugin/o/skills/b/b.skill.md.text',
        'plugin/o/skills/a/a.skill.md.text',
      ]);
    });

    it('reports nothing for a PR too large to analyze', () => {
      const changes = files(
        ...Array.from({ length: 3000 }, (_, index) => `plugin/o/skills/s${index}/x.skill.md.text`)
      );

      expect(getEvalSuggestions({ changes, suites: SUITES, labels: [] }).unmappedLlmFiles).toEqual(
        []
      );
    });
  });

  describe('where a suggested suite lives', () => {
    it('carries the suite config path, so a prompt can point at it', () => {
      const { suggestions } = getEvalSuggestions({
        changes: files('plugin/ab/server/prompts/system_prompt.ts'),
        suites: SUITES,
        labels: [],
      });

      expect(suggestions[0].configPath).toBe('pkg/ab/playwright.config.ts');
    });
  });

  describe('using the PR labels', () => {
    const change = files('plugin/ab/server/prompt.ts');
    const only = (labels: string[]) =>
      getEvalSuggestions({ changes: change, suites: SUITES, labels }).suggestions;

    it('suggests the suite label and a models label when nothing is selected', () => {
      expect(only([])).toEqual([
        expect.objectContaining({
          suiteId: 'agent-builder',
          status: 'suggested',
          labelsToAdd: ['evals:agent-builder'],
          needsModelLabel: true,
        }),
      ]);
    });

    it('does not ask for a models label when one is already present', () => {
      expect(only(['models:eis/x'])).toEqual([
        expect.objectContaining({
          status: 'suggested',
          labelsToAdd: ['evals:agent-builder'],
          needsModelLabel: false,
        }),
      ]);
    });

    it('still asks for a models label when only a judge label is present', () => {
      expect(only(['models:judge:eis/x'])).toEqual([
        expect.objectContaining({ status: 'suggested', needsModelLabel: true }),
      ]);
    });

    it('marks a selected suite without models as selected-needs-models', () => {
      expect(only(['evals:agent-builder'])).toEqual([
        expect.objectContaining({
          status: 'selected-needs-models',
          labelsToAdd: [],
          needsModelLabel: true,
        }),
      ]);
    });

    it('marks a selected suite with models as selected-will-run', () => {
      expect(only(['evals:agent-builder', 'models:eis/x'])).toEqual([
        expect.objectContaining({
          status: 'selected-will-run',
          labelsToAdd: [],
          needsModelLabel: false,
        }),
      ]);
    });

    it('treats evals:all as selecting every suite', () => {
      expect(only(['evals:all'])).toEqual([
        expect.objectContaining({ status: 'selected-needs-models' }),
      ]);
    });

    it('omits a suite that has a skip label', () => {
      expect(only(['evals:skip-agent-builder'])).toEqual([]);
    });

    it('does not ask for a models label when the suite pins defaults', () => {
      const { suggestions } = getEvalSuggestions({
        changes: files('pkg/smoke/evals/test.spec.ts'),
        suites: SUITES,
        labels: [],
      });

      expect(suggestions[0]).toMatchObject({ suiteId: 'smoke-tests', needsModelLabel: false });
    });
  });

  describe('limiting the output', () => {
    const manySuites: EvalsSuiteMetadataEntry[] = [1, 2, 3, 4, 5].map((n) => ({
      id: `s${n}`,
      ciLabels: [`evals:s${n}`],
      configPath: `pkg/s${n}/playwright.config.ts`,
      coverage: { include: [`src/s${n}/**`] },
    }));
    const manyChanges = files(...manySuites.map(({ id }) => `src/${id}/a.ts`));

    it('keeps three suggestions and moves the rest to overflow', () => {
      const result = getEvalSuggestions({ changes: manyChanges, suites: manySuites, labels: [] });

      expect(result.suggestions.map(({ suiteId }) => suiteId)).toEqual(['s1', 's2', 's3']);
      expect(result.overflow.map(({ suiteId }) => suiteId)).toEqual(['s4', 's5']);
    });

    it('puts suggested suites ahead of already selected ones', () => {
      const result = getEvalSuggestions({
        changes: manyChanges,
        suites: manySuites,
        labels: ['evals:s1', 'models:x'],
      });

      expect(result.suggestions.map(({ suiteId }) => suiteId)).toEqual(['s2', 's3', 's4']);
      expect(result.overflow.map(({ suiteId }) => suiteId)).toEqual(['s5', 's1']);
    });
  });
});
