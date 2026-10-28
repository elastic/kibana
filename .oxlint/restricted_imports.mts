/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

import { SCOUT_TEST_FILE_GLOBS } from './scout.mts';

// `no-restricted-imports` configs migrated from ESLint, with the file scopes, order and options
// they had there. Each override replaces the options of earlier ones for the files it matches, so
// the order below follows `.eslintrc.js`, with the nested `.eslintrc.js` files last because
// ESLint applied them over the root config.

const FP_TS_SUBSETS = [
  'Alt',
  'Alternative',
  'Applicative',
  'Apply',
  'Array',
  'Bifunctor',
  'boolean',
  'BooleanAlgebra',
  'Bounded',
  'BoundedDistributiveLattice',
  'BoundedJoinSemilattice',
  'BoundedLattice',
  'BoundedMeetSemilattice',
  'Category',
  'Chain',
  'ChainRec',
  'Choice',
  'Comonad',
  'Compactable',
  'Console',
  'Const',
  'Contravariant',
  'Date',
  'DistributiveLattice',
  'Either',
  'EitherT',
  'Eq',
  'Extend',
  'Field',
  'Filterable',
  'FilterableWithIndex',
  'Foldable',
  'FoldableWithIndex',
  'function',
  'Functor',
  'FunctorWithIndex',
  'Group',
  'HeytingAlgebra',
  'Identity',
  'Invariant',
  'IO',
  'IOEither',
  'IORef',
  'JoinSemilattice',
  'Lattice',
  'Magma',
  'Map',
  'MeetSemilattice',
  'Monad',
  'MonadIO',
  'MonadTask',
  'MonadThrow',
  'Monoid',
  'NonEmptyArray',
  'Option',
  'OptionT',
  'Ord',
  'Ordering',
  'pipeable',
  'Profunctor',
  'Random',
  'Reader',
  'ReaderEither',
  'ReaderT',
  'ReaderTask',
  'ReaderTaskEither',
  'ReadonlyArray',
  'ReadonlyMap',
  'ReadonlyNonEmptyArray',
  'ReadonlyRecord',
  'ReadonlySet',
  'ReadonlyTuple',
  'Record',
  'Ring',
  'Semigroup',
  'Semigroupoid',
  'Semiring',
  'Set',
  'Show',
  'State',
  'StateReaderTaskEither',
  'StateT',
  'Store',
  'Strong',
  'Task',
  'TaskEither',
  'TaskThese',
  'These',
  'TheseT',
  'Traced',
  'Traversable',
  'TraversableWithIndex',
  'Tree',
  'Tuple',
  'Unfoldable',
  'ValidationT',
  'Witherable',
  'Writer',
  'WriterT',
];

/** Restricted imports with suggested alternatives */
const RESTRICTED_IMPORTS = [
  {
    name: 'react-use',
    message: 'Please use react-use/lib/{method} instead.',
  },
  {
    name: 'react-use/lib',
    message: 'Please use react-use/lib/{method} instead.',
  },
  {
    name: 'react-router-dom',
    importNames: ['Router', 'Switch', 'Route'],
    message: 'Please use @kbn/shared-ux-router instead',
  },
  {
    name: '@kbn/kibana-react-plugin/public',
    importNames: ['Route'],
    message: 'Please use @kbn/shared-ux-router instead',
  },
  {
    name: 'rxjs/operators',
    message:
      'Please, use rxjs instead: rxjs/operators is just a subset, unnecessarily duplicating the package import.',
  },
  {
    name: '@elastic/ecs',
    importNames: ['EcsFlat'],
    message:
      'Do not import fields metadata directly in Kibana, as they can bloat the bundle size. Instead, consume metadata fields from @kbn/fields-metadata-plugin, which handles scoped field metadata retrieval (ECS, OTel, etc.).',
  },
  ...FP_TS_SUBSETS.map((subset) => ({
    name: `fp-ts/lib/${subset}`,
    message: `Please, use fp-ts/${subset} to avoid duplicating the package import`,
  })),
  {
    name: `fp-ts/lib`,
    message: `Please, use fp-ts to avoid duplicating the package import`,
  },
];

/**
 * FTR / Jest / Cypress test-infrastructure modules that Scout tests must never import.
 * Keeps Scout tests decoupled from FTR core (which is being deprecated) and makes the
 * selective-testing skip-list safe (see .buildkite/scripts/steps/test/scout/scout_ftr_modules.ts).
 */
const SCOUT_RESTRICTED_FTR_MODULES = [
  '@kbn/test',
  '@kbn/test-jest-helpers',
  '@kbn/test-eui-helpers',
  '@kbn/ftr-common-functional-services',
  '@kbn/ftr-common-functional-ui-services',
  '@kbn/ftr-screenshot-filename',
  '@kbn/ftr-benchmarks',
  '@kbn/cypress-test-helper',
  '@kbn/journeys',
  '@kbn/migrator-test-kit',
  '@kbn/detections-response-ftr-services',
];

const scoutRestrictedFtrPaths = SCOUT_RESTRICTED_FTR_MODULES.map((name) => ({
  name,
  message: `Scout tests must not import '${name}' (FTR/Cypress/Jest test infrastructure). The '@kbn/scout*' packages expose all supported types and utilities that Scout tests need.`,
}));

const scoutRestrictedFtrPatterns = {
  group: SCOUT_RESTRICTED_FTR_MODULES.map((name) => `${name}/**`),
  message:
    "Scout tests must not import FTR/Cypress/Jest test infrastructure. The '@kbn/scout*' packages expose all supported types and utilities that Scout tests need.",
};

/** Scout solution tests must import the solution's Scout package instead of `@kbn/scout`. */
const scoutSolutionRestrictions = (message: string) => ({
  paths: [
    { name: '@kbn/scout', message },
    { name: '@playwright/test', message },
    { name: 'playwright', message },
    ...scoutRestrictedFtrPaths,
  ],
  patterns: [
    { group: ['@kbn/scout/**', '@playwright/test/**', 'playwright/**'], message },
    scoutRestrictedFtrPatterns,
  ],
});

/**
 * The nested `.eslintrc.js` files of these directories re-applied the root overrides that
 * covered them, scoped to the directory, with `enzyme` restricted as an error.
 */
const ENZYME_RESTRICTED_IMPORTS = [
  ...RESTRICTED_IMPORTS,
  {
    name: 'enzyme',
    message: 'Please use @testing-library/react instead',
  },
];

const ENZYME_RESTRICTED_DIRS = [
  'src/platform/packages/shared/kbn-cell-actions',
  'src/platform/packages/shared/kbn-securitysolution-ecs',
  'x-pack/solutions/security/plugins/ecs_data_quality_dashboard',
];

const ENZYME_RESTRICTED_SECURITY_DIRS = [
  'x-pack/solutions/security/packages/connectors',
  'x-pack/solutions/security/packages/ecs-data-quality-dashboard',
  'x-pack/solutions/security/packages/features',
  'x-pack/solutions/security/packages/navigation',
  'x-pack/solutions/security/packages/side-nav',
  'x-pack/solutions/security/packages/upselling',
  'x-pack/solutions/security/plugins/security_solution/public/cases',
  'x-pack/solutions/security/plugins/security_solution/public/dashboards',
  'x-pack/solutions/security/plugins/security_solution/public/explore',
  'x-pack/solutions/security/plugins/security_solution/public/onboarding',
  'x-pack/solutions/security/plugins/security_solution/public/overview',
  'x-pack/solutions/security/plugins/security_solution/public/reports',
];

export const restrictedImportsOverrides: OxlintOverride[] = [
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', ...RESTRICTED_IMPORTS],
    },
  },
  {
    files: ['**/common/**/*.{js,mjs,ts,tsx}', '**/public/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        ...RESTRICTED_IMPORTS,
        {
          name: 'semver',
          message: 'Please use "semver/*/{function}" instead',
        },
      ],
    },
  },
  {
    files: ['x-pack/platform/plugins/shared/fields_metadata/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        // Exclude @elastic/ecs from restricted imports for the fields metadata plugin.
        ...RESTRICTED_IMPORTS.filter(({ name }) => name !== '@elastic/ecs'),
      ],
    },
  },
  /**
   * Automatic Import overrides
   */
  {
    // front end and common typescript and javascript files only
    files: [
      'x-pack/platform/plugins/shared/automatic_import/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/automatic_import/common/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // prevents UI code from importing server side code and then webpack including it when doing builds
          patterns: ['**/server/*'],
          paths: RESTRICTED_IMPORTS,
        },
      ],
    },
  },
  /**
   * Security Solution overrides. These rules below are maintained and owned by
   * the people within the security-detection-engine team. Please see ping them
   * or check with them if you are encountering issues, have suggestions, or would
   * like to add, change, or remove any particular rule. Linters, Typescript, and rules
   * evolve and change over time just like coding styles, so please do not hesitate to
   * reach out.
   */
  {
    // front end and common typescript and javascript files only
    files: [
      'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/common/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/elastic_assistant/common/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_ess/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_serverless/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/common/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_ess/common/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_serverless/common/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/common/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/cases/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/cases/common/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-cell-actions/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // prevents UI code from importing server side code and then webpack including it when doing builds
          patterns: ['**/server/*'],
          paths: RESTRICTED_IMPORTS,
        },
      ],
    },
  },
  {
    // typescript only for front and back end
    files: [
      'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/elastic_assistant/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/automatic_import/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-langchain/**/*.{ts,tsx}',
      'x-pack/solutions/security/packages/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_ess/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_serverless/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/cases/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-cell-actions/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // prevents code from importing files that contain the name "legacy" within their name. This is a mechanism
          // to help deprecation and prevent accidental re-use/continued use of code we plan on removing. If you are
          // finding yourself turning this off a lot for "new code" consider renaming the file and functions if it is has valid uses.
          patterns: ['*legacy*'],
          paths: RESTRICTED_IMPORTS,
        },
      ],
    },
  },
  /**
   * Lists overrides. These rules below are maintained and owned by
   * the people within the security-detection-engine team. Please see ping them
   * or check with them if you are encountering issues, have suggestions, or would
   * like to add, change, or remove any particular rule. Linters, Typescript, and rules
   * evolve and change over time just like coding styles, so please do not hesitate to
   * reach out.
   */
  {
    // front end and common typescript and javascript files only
    files: [
      'x-pack/solutions/security/plugins/lists/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/lists/common/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // prevents UI code from importing server side code and then webpack including it when doing builds
          patterns: ['**/server/*'],
          paths: RESTRICTED_IMPORTS,
        },
      ],
    },
  },
  {
    // typescript and javascript for front and back
    files: ['x-pack/solutions/security/plugins/lists/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // prevents code from importing files that contain the name "legacy" within their name. This is a mechanism
          // to help deprecation and prevent accidental re-use/continued use of code we plan on removing. If you are
          // finding yourself turning this off a lot for "new code" consider renaming the file and functions if it has valid uses.
          patterns: ['*legacy*'],
          paths: RESTRICTED_IMPORTS,
        },
      ],
    },
  },
  /**
   * Stack Connectors Specs package
   * This package contains common code for public and server side
   */
  {
    files: ['src/platform/packages/shared/kbn-connector-specs/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // prevents UI code from importing server side code and then webpack including it when doing builds
          patterns: ['**/*server*'],
          paths: RESTRICTED_IMPORTS,
        },
      ],
    },
  },
  {
    // The server entry, tests and test tooling are never bundled into UI code, so they may import
    // server modules.
    files: [
      'src/platform/packages/shared/kbn-connector-specs/server.ts',
      'src/platform/packages/shared/kbn-connector-specs/**/*.test.{ts,tsx}',
      'src/platform/packages/shared/kbn-connector-specs/src/test/**/*.ts',
      'src/platform/packages/shared/kbn-connector-specs/scripts/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', { paths: RESTRICTED_IMPORTS }],
    },
  },
  /**
   * Exception for connector specs whose product name contains 'server' (e.g., sharepoint_server).
   * These are connector configuration specs (shared-common code), not server-side runtime code.
   * The **\/*server* pattern in the parent rule is relaxed here to allow intra-package imports.
   */
  {
    files: [
      'src/platform/packages/shared/kbn-connector-specs/src/all_specs.ts',
      'src/platform/packages/shared/kbn-connector-specs/src/specs/sharepoint_server/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', { paths: RESTRICTED_IMPORTS }],
    },
  },
  /**
   * Workflows Team: generic rules
   */
  {
    files: [
      'src/platform/plugins/shared/workflows_management/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_execution_engine/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_extensions/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-workflows/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-workflows-ui/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // prevents code from importing files that contain the name "legacy" within their name. This is a mechanism
          // to help deprecation and prevent accidental re-use/continued use of code we plan on removing. If you are
          // finding yourself turning this off a lot for "new code" consider renaming the file and functions if it is has valid uses.
          patterns: [
            '*legacy*',
            // Kibana has endpoint /api/spaces/_disable_legacy_url_aliases, resulting in generated file kibana.post_spaces_disable_legacy_url_aliases.gen.ts,
            // this pattern allows to import this generated file
            '!*.gen',
          ],
          paths: RESTRICTED_IMPORTS,
        },
      ],
    },
  },
  {
    // @rspack/* packages are pure ESM. Direct value imports work in
    // production (Node require(esm)) but break any Jest test that loads
    // them, so the optimizer must go through its rspack_runtime shim, which
    // loads them natively via createRequire (see rspack_runtime.ts).
    // ESLint ran these through `@typescript-eslint/no-restricted-imports` next to the repo-wide
    // `no-restricted-imports`; Oxlint has one rule, so both lists are merged here.
    files: [
      'packages/kbn-rspack-optimizer/**/*.{ts,tsx}',
      'packages/kbn-plugin-helpers/src/tasks/optimize.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        ...RESTRICTED_IMPORTS,
        {
          name: '@rspack/core',
          allowTypeImports: true,
          message:
            'Import the `rspack` runtime value from the optimizer rspack_runtime shim instead (@rspack/core is pure ESM and breaks under Jest). Type imports are fine.',
        },
        {
          name: '@rspack/plugin-react-refresh',
          allowTypeImports: true,
          message:
            'Load via loadReactRefreshRspackPlugin() from the rspack_runtime shim (pure ESM, breaks under Jest). Type imports are fine.',
        },
        {
          name: '@rsdoctor/rspack-plugin',
          allowTypeImports: true,
          message:
            'Load via loadRsdoctorRspackPlugin() from the rspack_runtime shim (pure ESM, breaks under Jest). Type imports are fine.',
        },
      ],
    },
  },
  {
    files: ['x-pack/**/cypress/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@kbn/cypress-test-helper',
              message:
                "Import from a sub-path (e.g. '@kbn/cypress-test-helper/src/utils'). Cypress uses Webpack, which requires direct file imports to avoid parse errors.",
            },
          ],
        },
      ],
    },
  },
  {
    // Default for every Scout suite; the solution overrides below re-declare
    // `no-restricted-imports` for their own paths and take precedence.
    files: SCOUT_TEST_FILE_GLOBS,
    // Scout's own `ScoutPage` fixture is built on top of Playwright, so it has to import it.
    excludeFiles: ['src/platform/packages/shared/kbn-scout/src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              message: "Platform tests should import only from '@kbn/scout'.",
            },
            {
              name: 'playwright',
              message: "Platform tests should import only from '@kbn/scout'.",
            },
            ...scoutRestrictedFtrPaths,
          ],
          patterns: [
            {
              group: [
                '@kbn/scout-oblt',
                '@kbn/scout-oblt/**',
                '@kbn/scout-search',
                '@kbn/scout-search/**',
                '@kbn/scout-security',
                '@kbn/scout-security/**',
                '@kbn/scout-info',
                '@kbn/scout-info/**',
                '@kbn/scout-reporting',
                '@kbn/scout-reporting/**',
                '@kbn/scout-release-testing',
                '@kbn/scout-release-testing/**',
                '@playwright/test/**',
                'playwright/**',
              ],
              message:
                "Platform tests should import from '@kbn/scout' (and '@kbn/scout-synthtrace' if you need synthtrace).",
            },
            scoutRestrictedFtrPatterns,
          ],
        },
      ],
    },
  },
  {
    files: ['x-pack/solutions/observability/**/test/{scout,scout_*}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        scoutSolutionRestrictions(
          "Observability solution tests should import from '@kbn/scout-oblt' instead."
        ),
      ],
    },
  },
  {
    files: ['x-pack/solutions/search/**/test/{scout,scout_*}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        scoutSolutionRestrictions(
          "Search solution tests should import from '@kbn/scout-search' instead."
        ),
      ],
    },
  },
  {
    files: ['x-pack/solutions/security/**/test/{scout,scout_*}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        scoutSolutionRestrictions(
          "Security solution tests should import from '@kbn/scout-security' instead."
        ),
      ],
    },
  },
  // Nested `.eslintrc.js` files
  {
    files: ENZYME_RESTRICTED_DIRS.map((dir) => `${dir}/**/*.{js,mjs,ts,tsx}`),
    rules: {
      'no-restricted-imports': ['error', { paths: ENZYME_RESTRICTED_IMPORTS }],
    },
  },
  {
    files: ENZYME_RESTRICTED_SECURITY_DIRS.map((dir) => `${dir}/**/*.{js,mjs,ts,tsx}`),
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/server/*'], paths: ENZYME_RESTRICTED_IMPORTS },
      ],
    },
  },
  {
    files: ENZYME_RESTRICTED_SECURITY_DIRS.map((dir) => `${dir}/**/*.{ts,tsx}`),
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['*legacy*'], paths: ENZYME_RESTRICTED_IMPORTS },
      ],
    },
  },
];
