/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/swc-register').install();

const { getPackages } = require('@kbn/repo-packages');
const { REPO_ROOT } = require('@kbn/repo-info');
const { TESTABLE_COMPONENT_SCOUT_ROOT_PATH_GLOB } = require('@kbn/scout-info');

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

const SCOUT_TEST_FILE_GLOBS = [
  `${TESTABLE_COMPONENT_SCOUT_ROOT_PATH_GLOB}/**/*.ts`,
  'packages/**/test/scout{_*,}/**/*.ts',
  'src/dev/build/test/scout{_*,}/**/*.ts',
];

/** Packages which should not be included within production code. */
const DEV_PACKAGE_DIRS = getPackages(REPO_ROOT).flatMap((pkg) =>
  pkg.isDevOnly() ? pkg.normalizedRepoRelativeDir : []
);

/** Directories (at any depth) which include dev-only code. */
const DEV_DIRECTORIES = [
  '.storybook',
  '__tests__',
  '__test__',
  '__jest__',
  '__fixtures__',
  '__mocks__',
  '__stories__',
  'e2e',
  'cypress',
  'fixtures',
  'ftr_e2e',
  'integration_tests',
  'manual_tests',
  'mock',
  'mocks',
  'storybook',
  'scripts',
  'test',
  'test-d',
  'test_utils',
  'test_utilities',
  'test_helpers',
  'tests_client_integration',
  'tsd_tests',
];

/** File patterns for dev-only code. */
const DEV_FILE_PATTERNS = [
  '*.mock.{js,ts,tsx}',
  '*.test.{js,ts,tsx}',
  '*.test.helpers.{js,ts,tsx}',
  '*.stories.{js,ts,tsx}',
  '*.story.{js,ts,tsx}',
  '*.stub.{js,ts,tsx}',
  'mock.{js,ts,tsx}',
  '_stubs.{js,ts,tsx}',
  '{testHelpers,test_helper,test_utils}.{js,ts,tsx}',
  '{postcss,webpack,cypress}.config.{js,ts}',
];

/** Glob patterns which describe dev-only code. */
const DEV_PATTERNS = [
  ...DEV_PACKAGE_DIRS.map((pkg) => `${pkg}/**/*`),
  ...DEV_DIRECTORIES.map((dir) => `{packages,src,x-pack}/**/${dir}/**/*`),
  ...DEV_FILE_PATTERNS.map((file) => `{packages,src,x-pack}/**/${file}`),
  'src/platform/packages/shared/kbn-interpreter/tasks/**/*',
  'src/dev/**/*',
  'x-pack/{dev-tools,tasks,test,build_chromium}/**/*',
  'x-pack/performance/**/*',
  'src/setup_node_env/index.js',
  'src/cli/dev.js',
  'src/platform/packages/shared/esql/kbn-esql-language/scripts/**/*',
  'src/platform/kbn-ui/_tooling/**/*',
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
  ...[
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
  ].map((subset) => {
    return {
      name: `fp-ts/lib/${subset}`,
      message: `Please, use fp-ts/${subset} to avoid duplicating the package import`,
    };
  }),
  {
    name: `fp-ts/lib`,
    message: `Please, use fp-ts to avoid duplicating the package import`,
  },
];

module.exports = {
  root: true,

  extends: ['@kbn/eslint-config'],

  overrides: [
    /**
     * Temporarily disable some react rules for specific plugins, remove in separate PRs
     */
    {
      files: ['src/platform/plugins/shared/kibana_react/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'react-hooks/rules-of-hooks': 'off',
        'react-hooks/exhaustive-deps': 'off',
      },
    },
    {
      files: ['src/platform/plugins/shared/kibana_utils/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'react-hooks/exhaustive-deps': 'off',
      },
    },
    /**
     * FormatJS linter for i18n code.
     * https://formatjs.io/docs/tooling/linter
     */
    {
      files: [
        'src/**/*.{js,mjs,ts,tsx}',
        'x-pack/**/*.{js,mjs,ts,tsx}',
        'packages/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/**/*.{js,mjs,ts,tsx}',
        'src/core/packages/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/packages/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/*/packages/**/*.{js,mjs,ts,tsx}',
      ],
      plugins: ['formatjs'],
      rules: {
        'formatjs/enforce-default-message': ['error', 'anything'],
        'formatjs/enforce-description': 'off',
      },
    },

    /**
     * Single package.json rules, it tells eslint to ignore the child package.json files
     * and look for dependencies declarations in the single and root level package.json
     */
    {
      files: ['{src,x-pack,packages}/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          { devDependencies: false, peerDependencies: true, packageDir: __dirname },
        ],
      },
      overrides: [
        {
          /* Files that ARE allowed to use devDependencies. Matched here rather than through the
           * rule's `devDependencies` globs, which the rule recompiles for every linted file. */
          files: DEV_PATTERNS,
          // the rule matched its globs without `dot`, so dot paths other than `.storybook` stay out
          excludedFiles: ['**/.!(storybook)', '**/.!(storybook)/**'],
          rules: {
            'import/no-extraneous-dependencies': [
              'error',
              { devDependencies: true, peerDependencies: true, packageDir: __dirname },
            ],
          },
        },
      ],
    },

    /**
     * Files that run BEFORE node version check
     */
    {
      files: ['scripts/**/*.js', 'src/setup_node_env/**/*.js'],
      rules: {
        'no-restricted-syntax': [
          'error',
          'ImportDeclaration',
          'ExportNamedDeclaration',
          'ExportDefaultDeclaration',
          'ExportAllDeclaration',
          'ArrowFunctionExpression',
          'AwaitExpression',
          'ClassDeclaration',
          'RestElement',
          'SpreadElement',
          'YieldExpression',
          'VariableDeclaration[kind="const"]',
          'VariableDeclaration[kind="let"]',
          'VariableDeclarator[id.type="ArrayPattern"]',
          'VariableDeclarator[id.type="ObjectPattern"]',
        ],
      },
    },

    /**
     * Files that run in the browser with only node-level transpilation
     */
    {
      files: [
        'src/platform/packages/shared/kbn-ftr-common-functional-ui-services/services/web_element_wrapper/scroll_into_view_if_necessary.js',
        '**/browser_exec_scripts/**/*.js',
      ],
      rules: {
        'no-restricted-syntax': [
          'error',
          'ArrowFunctionExpression',
          'AwaitExpression',
          'ClassDeclaration',
          'ImportDeclaration',
          'RestElement',
          'SpreadElement',
          'YieldExpression',
          'VariableDeclaration[kind="const"]',
          'VariableDeclaration[kind="let"]',
          'VariableDeclarator[id.type="ArrayPattern"]',
          'VariableDeclarator[id.type="ObjectPattern"]',
        ],
      },
    },

    /**
     * Files that run AFTER node version check
     * and are not also transpiled with babel
     */
    {
      files: [
        '.eslintrc.js',
        'packages/kbn-eslint-plugin-eslint/**/*',
        'x-pack/gulpfile.js',
        'x-pack/scripts/*.js',
        '**/jest.config.js',
      ],
      excludedFiles: ['**/integration_tests/**/*'],
      rules: {
        'no-restricted-syntax': [
          'error',
          'ImportDeclaration',
          'ExportNamedDeclaration',
          'ExportDefaultDeclaration',
          'ExportAllDeclaration',
        ],
      },
    },

    /**
     * Harden specific rules
     */
    {
      files: [
        'src/platform/test/harden/*.js',
        'src/platform/packages/shared/kbn-safer-lodash-set/test/*.js',
      ],
      rules: {
        'mocha/handle-done-callback': 'off',
      },
    },
    {
      files: ['**/*.{js,mjs,ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', ...RESTRICTED_IMPORTS],
        'no-restricted-modules': [
          'error',
          {
            name: 'lodash.set',
            message: 'Please use @kbn/safer-lodash-set instead',
          },
          {
            name: 'lodash.setwith',
            message: 'Please use @kbn/safer-lodash-set instead',
          },
          {
            name: 'lodash.template',
            message:
              'lodash.template is unsafe, and not compatible with our content security policy.',
          },
          {
            name: 'lodash/set',
            message: 'Please use @kbn/safer-lodash-set/set instead',
          },
          {
            name: 'lodash/setWith',
            message: 'Please use @kbn/safer-lodash-set/setWith instead',
          },
          {
            name: 'lodash/fp/set',
            message: 'Please use @kbn/safer-lodash-set/fp/set instead',
          },
          {
            name: 'lodash/fp/setWith',
            message: 'Please use @kbn/safer-lodash-set/fp/setWith instead',
          },
          {
            name: 'lodash/fp/assoc',
            message: 'Please use @kbn/safer-lodash-set/fp/assoc instead',
          },
          {
            name: 'lodash/fp/assocPath',
            message: 'Please use @kbn/safer-lodash-set/fp/assocPath instead',
          },
          {
            name: 'lodash/fp/template',
            message:
              'lodash.template is unsafe, and not compatible with our content security policy.',
          },
          {
            name: 'lodash/template',
            message:
              'lodash.template is unsafe, and not compatible with our content security policy.',
          },
        ],
      },
    },
    {
      // This file is the security control that hardens lodash.template, so it must load the
      // otherwise-restricted lodash template modules in order to wrap them with safe proxies.
      files: ['src/setup_node_env/harden/index.js'],
      rules: {
        'no-restricted-modules': 'off',
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
     * APM, UX and Observability overrides
     */
    {
      files: [
        'x-pack/solutions/observability/plugins/apm/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/observability/plugins/observability/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/observability/plugins/exploratory_view/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/observability/plugins/ux/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/observability/plugins/slo/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/observability/packages/**/*.{js,mjs,ts,tsx}',
      ],
      rules: {
        'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
      },
    },
    {
      files: [
        'x-pack/platform/plugins/shared/observability_solution/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/**/*.{ts,tsx}',
        'x-pack/platform/plugins/shared/{significant_events_app,streams,streams_app}/**/*.{ts,tsx}',
        'x-pack/solutions/observability/packages/**/*.{ts,tsx}',
      ],
      rules: {
        'react-hooks/exhaustive-deps': [
          'error',
          {
            additionalHooks:
              '^(useUrl|useAbortableAsync|useMemoWithAbortSignal|useFetcher|useProgressiveFetcher|useBreadcrumb|useAsync|useTimeRangeAsync|useAutoAbortedHttpClient|use.*Fetch)$',
          },
        ],
      },
    },
    {
      files: [
        'x-pack/solutions/observability/plugins/apm/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/apm_data_access/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/infra/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/inventory/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/metrics_data_access/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/profiling/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/profiling_data_access/**/*.{ts,tsx}',
      ],
    },

    /**
     * Fleet overrides
     */
    {
      files: ['x-pack/platform/plugins/shared/fleet/**/*.{js,mjs,ts,tsx}'],
      // `testing-library/*` rules run in oxlint (.oxlint/testing_library.mts); registered for `eslint-disable` directives.
      plugins: ['testing-library'],
      rules: {
        'import/order': [
          'warn',
          {
            groups: ['builtin', 'external', 'internal', 'parent'],
            'newlines-between': 'always-and-inside-groups',
          },
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
        'no-duplicate-imports': 'off',
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
      files: [
        'x-pack/platform/plugins/shared/automatic_import/public/**/*.{ts,tsx}',
        'x-pack/platform/plugins/shared/automatic_import/common/**/*.{ts,tsx}',
      ],
    },

    /**
     * ML overrides
     */
    {
      files: [
        'x-pack/platform/plugins/shared/aiops/**/*.{ts,tsx}',
        'x-pack/platform/plugins/private/data_visualizer/**/*.{ts,tsx}',
        'x-pack/platform/plugins/shared/ml/**/*.{ts,tsx}',
        'x-pack/platform/plugins/private/transform/**/*.{ts,tsx}',
        'x-pack/platform/packages/shared/ml/**/*.{ts,tsx}',
        'x-pack/platform/packages/private/ml/**/*.{ts,tsx}',
        'x-pack/platform/plugins/private/file_upload/**/*.{ts,tsx}',
      ],
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
        'no-duplicate-imports': 'off',
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
    {
      // typescript and javascript for front and back end
      files: [
        'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/security/plugins/elastic_assistant/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/plugins/shared/automatic_import/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/packages/shared/kbn-langchain/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/security/packages/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/security/plugins/security_solution/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/security/plugins/security_solution_ess/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/security/plugins/security_solution_serverless/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/security/plugins/timelines/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/plugins/shared/cases/**/*.{js,mjs,ts,tsx}',
        'x-pack/solutions/security/packages/data-stream-adapter/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-cell-actions/**/*.{js,mjs,ts,tsx}',
      ],
      plugins: ['eslint-plugin-n', 'react'],
      env: {
        jest: true,
      },
      rules: {
        complexity: 'warn',

        'no-duplicate-imports': 'off',
        'no-implicit-globals': 'error',
        // rely on typescript
        'no-undef': 'off',
        'no-useless-return': 'error',
        'react/boolean-prop-naming': 'error',
        'react/display-name': 'error',
        'react/no-access-state-in-setstate': 'error',
        'react/no-deprecated': 'error',
        'react/no-typos': 'error',
        'react/no-unused-prop-types': 'error',
        'react/no-unused-state': 'error',
        'react/sort-default-props': 'error',
        'react/jsx-no-literals': 'error',
        'require-atomic-updates': 'error',
      },
      overrides: [
        {
          files: [
            'x-pack/platform/plugins/shared/cases/**/*.{ts,tsx}',
            'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/**/*.{ts,tsx}',
            'x-pack/solutions/security/plugins/security_solution/**/*.{ts,tsx}',
            'x-pack/solutions/security/plugins/security_solution_ess/**/*.{ts,tsx}',
            'x-pack/solutions/security/plugins/security_solution_serverless/**/*.{ts,tsx}',
            'x-pack/solutions/security/packages/data-stream-adapter/**/*.{ts,tsx}',
            'x-pack/solutions/security/packages/features/**/*.{ts,tsx}',
            'x-pack/solutions/security/packages/navigation/**/*.{ts,tsx}',
            'src/platform/packages/shared/kbn-cell-actions/**/*.{ts,tsx}',
          ],
        },
      ],
    },
    {
      files: ['x-pack/platform/plugins/shared/cases/public/**/*.{js,mjs,ts,tsx}'],
      excludedFiles: ['x-pack/platform/plugins/shared/cases/**/*.{test,mock,test_helper}.{ts,tsx}'],
      rules: {
        'react/display-name': ['error', { ignoreTranspilerName: true }],
      },
    },
    {
      files: ['x-pack/platform/plugins/shared/cases/**/*.{test,mock,test_helper}.tsx'],
      // `testing-library/*` rules run in oxlint (.oxlint/testing_library.mts); registered for `eslint-disable` directives.
      plugins: ['testing-library'],
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
      // typescript for /public and /common
      files: [
        'x-pack/solutions/security/plugins/lists/public/*.{ts,tsx}',
        'x-pack/solutions/security/plugins/lists/common/*.{ts,tsx}',
      ],
      rules: {
        '@typescript-eslint/no-for-in-array': 'error',
      },
    },
    {
      // typescript for /public and /common
      files: [
        'x-pack/solutions/security/plugins/lists/public/*.{ts,tsx}',
        'x-pack/solutions/security/plugins/lists/common/*.{ts,tsx}',
      ],
      plugins: ['react'],
      env: {
        jest: true,
      },
      rules: {
        'react/boolean-prop-naming': 'error',
        'react/display-name': 'error',
        'react/no-access-state-in-setstate': 'error',
        'react/no-deprecated': 'error',
        'react/no-typos': 'error',
        'react/no-unused-prop-types': 'error',
        'react/no-unused-state': 'error',
        'react/sort-comp': 'error',
        'react/sort-default-props': 'error',
        'react/jsx-no-literals': 'error',
      },
    },
    {
      files: [
        'src/platform/test/{accessibility,*functional*}/apps/**/*.{js,ts}',
        'src/platform/test/*api_integration*/**/*.{js,ts}',
        'x-pack/platform/test/{accessibility,*functional*}/apps/**/*.{js,ts}',
        'x-pack/platform/test/*api_integration*/**/*.{js,ts}',
        'x-pack/platform/test/*functional/tests/**/*.{js,ts}',
      ],
      extends: ['plugin:mocha/recommended'],
      plugins: ['mocha'],
      env: {
        mocha: true,
      },
      rules: {
        'mocha/no-mocha-arrows': 'off',
        'mocha/no-exports': 'off',
        'mocha/no-setup-in-describe': 'off',
        'mocha/no-nested-tests': 'off',
        'mocha/no-skipped-tests': 'off',
      },
    },
    {
      files: ['**/kbn-scout*/src/playwright/**/*.ts', ...SCOUT_TEST_FILE_GLOBS],
      excludedFiles: ['src/platform/packages/shared/kbn-scout/src/playwright/**/*.test.ts'],
      // `eslint-plugin-playwright` rules run in oxlint (.oxlint/playwright.mts). The plugin stays
      // registered so `eslint-disable` directives naming its rules resolve.
      plugins: ['playwright'],
      rules: {
        // Turned off by `plugin:playwright/recommended`: fixtures are often destructured as `({}, testInfo)`.
        'no-empty-pattern': 'off',
      },
    },
    {
      files: ['x-pack/solutions/security/plugins/lists/public/**/!(*.test).{js,mjs,ts,tsx}'],
      plugins: ['react-perf'],
      rules: {
        'react-perf/jsx-no-new-object-as-prop': 'error',
        'react-perf/jsx-no-new-array-as-prop': 'error',
        'react/jsx-no-bind': 'error',
      },
    },
    {
      // typescript and javascript for front and back
      files: ['x-pack/solutions/security/plugins/lists/**/*.{js,mjs,ts,tsx}'],
      plugins: ['eslint-plugin-n'],
      env: {
        jest: true,
      },
      rules: {
        complexity: 'error',
        'consistent-return': 'error',
        'import/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
            'newlines-between': 'always',
          },
        ],

        'no-duplicate-imports': 'off',
        'no-implicit-globals': 'error',
        // rely on typescript
        'no-undef': 'off',
        'no-useless-return': 'error',
        'require-atomic-updates': 'error',
        'sort-keys': 'error',
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
     * ResponseOps overrides
     */
    {
      files: [
        'src/platform/packages/shared/response-ops/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/alerting/**/*.{ts,tsx}',
        'x-pack/platform/plugins/shared/actions/**/*.{ts,tsx}',
        'x-pack/platform/plugins/shared/stack_alerts/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/stack_connectors/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/triggers_actions_ui/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/event_log/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/rule_registry/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/task_manager/**/*.{ts, tsx}',
        'x-pack/solutions/observability/packages/kbn-alerts-grouping/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-alerts-ui-shared/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-alerting-types/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-cases-components/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-actions-types/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-alerts-as-data-utils/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-grouping/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-rrule/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-rule-data-utils/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-triggers-actions-ui-types/**/*.{ts, tsx}',
        'x-pack/platform/packages/shared/kbn-alerting-comparators/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/embeddable_alerts_table/**/*.{ts,tsx}',
        'x-pack/platform/test/alerting_api_integration/**/*.{ts, tsx}',
        'x-pack/platform/test/cases_api_integration/**/*.{ts, tsx}',
        'x-pack/platform/test/reporting_api_integration/**/*.{ts, tsx}',
        'x-pack/solutions/**/test/cases_api_integration/**/*.{ts, tsx}',
        'x-pack/platform/test/rule_registry/**/*.{ts, tsx}',
        'x-pack/platform/test/api_integration/apis/cases/**/*.{ts, tsx}',
        'x-pack/solutions/**/test/api_integration/apis/cases/**/*.{ts, tsx}',
      ],
    },
    /**
     * Stack Connectors Specs package
     * This package contains common code for public and server side
     */
    {
      files: ['src/platform/packages/shared/kbn-connector-specs/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'no-duplicate-imports': 'off',
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
      // The server entry and tests are never bundled into UI code, so they may import server modules.
      files: [
        'src/platform/packages/shared/kbn-connector-specs/server.ts',
        'src/platform/packages/shared/kbn-connector-specs/**/*.test.{ts,tsx}',
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
     * Custom Content overrides
     */
    {
      files: [
        'x-pack/platform/plugins/shared/custom_content/**/*.{ts,tsx}',
        'x-pack/platform/packages/shared/custom-content/**/*.{ts,tsx}',
      ],
      rules: {
        'react-hooks/exhaustive-deps': 'error',
      },
    },

    /**
     * Enterprise Search overrides
     * NOTE: We also have a single rule at the bottom of the file that
     * overrides Prettier's default of not linting unnecessary backticks
     */
    {
      // All files
      files: ['x-pack/solutions/search/plugins/enterprise_search/**/*.{ts,tsx}'],
      rules: {
        'import/order': [
          'error',
          {
            groups: ['unknown', ['builtin', 'external'], 'internal', 'parent', 'sibling', 'index'],
            pathGroups: [
              {
                pattern:
                  '{../../../../../../,../../../../../,../../../../,../../../,../../,../,./}{common/,*}__mocks__{*,/**}',
                group: 'unknown',
              },
              {
                pattern: '{**,.}/*.mock',
                group: 'unknown',
              },
              {
                pattern: 'react*',
                group: 'external',
                position: 'before',
              },
              {
                pattern: '{@elastic/**,@kbn/**,src/**}',
                group: 'internal',
              },
            ],
            pathGroupsExcludedImportTypes: [],
            alphabetize: {
              order: 'asc',
              caseInsensitive: true,
            },
            'newlines-between': 'always-and-inside-groups',
          },
        ],
        'react-hooks/exhaustive-deps': 'off',
        'sort-keys': 1, // warning
        '@typescript-eslint/member-ordering': [1, { default: { order: 'alphabetically' } }], // warning
      },
    },

    /**
     * Canvas overrides
     */
    {
      files: ['x-pack/platform/plugins/private/canvas/**/*.js'],
      rules: {
        // module importing
        'import/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          },
        ],

        // react
        'react/sort-comp': 'error',
      },
    },
    {
      files: [
        'x-pack/platform/plugins/private/canvas/gulpfile.js',
        'x-pack/platform/plugins/private/canvas/scripts/*.js',
        'x-pack/platform/plugins/private/canvas/tasks/*.js',
        'x-pack/platform/plugins/private/canvas/tasks/**/*.js',
        'x-pack/platform/plugins/private/canvas/__tests__/**/*.js',
        'x-pack/platform/plugins/private/canvas/**/{__tests__,__test__,__jest__,__fixtures__,__mocks__}/**/*.js',
      ],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
            peerDependencies: true,
            packageDir: __dirname,
          },
        ],
      },
    },
    {
      files: ['x-pack/platform/plugins/private/canvas/canvas_plugin_src/**/*.js'],
      globals: { canvas: true },
    },
    {
      files: ['x-pack/platform/plugins/private/canvas/public/**/*.js'],
      env: {
        browser: true,
      },
    },

    /**
     * Osquery overrides
     */
    {
      files: ['x-pack/platform/plugins/shared/osquery/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'padding-line-between-statements': [
          'error',
          {
            blankLine: 'always',
            prev: ['block-like'],
            next: ['*'],
          },
          {
            blankLine: 'always',
            prev: ['*'],
            next: ['return'],
          },
        ],
        // Rules from `eslint:recommended` and `plugin:react/recommended` that don't run in oxlint.
        'no-dupe-args': 'error',
        'no-new-symbol': 'error',
        'no-octal': 'error',
        'no-unsafe-optional-chaining': 'error',
        'react/display-name': 'error',
        'react/no-deprecated': 'error',
      },
    },
    {
      files: ['x-pack/platform/plugins/shared/osquery/**/*.{ts,tsx}'],
    },
    {
      // typescript and javascript for front end react performance
      files: ['x-pack/platform/plugins/shared/osquery/public/**/!(*.test).{js,mjs,ts,tsx}'],
      plugins: ['react', 'react-perf'],
      rules: {
        'react-perf/jsx-no-new-object-as-prop': 'error',
        'react-perf/jsx-no-new-array-as-prop': 'error',
        'react/jsx-no-bind': 'error',
      },
    },

    /**
     * Platform Security Team overrides
     */
    {
      files: [
        'src/platform/plugins/private/interactive_setup/**/*.{js,mjs,ts,tsx}',

        'packages/kbn-mock-idp-plugin/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/private/kbn-mock-idp-utils/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-security-hardening/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-user-profile-components/**/*.{js,mjs,ts,tsx}',

        'x-pack/platform/plugins/shared/encrypted_saved_objects/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/test/encrypted_saved_objects_api_integration/**/*.{js,mjs,ts,tsx}',

        'x-pack/platform/plugins/shared/security/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/packages/private/security/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/packages/shared/security/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/test/security_api_integration/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/test/security_functional/**/*.{js,mjs,ts,tsx}',

        'x-pack/platform/plugins/shared/spaces/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/test/spaces_api_integration/**/*.{js,mjs,ts,tsx}',
      ],
      rules: {
        'import/order': [
          // This rule sorts import declarations
          'error',
          {
            groups: [
              'unknown',
              ['builtin', 'external'],
              'internal',
              ['parent', 'sibling', 'index'],
            ],
            pathGroups: [
              {
                pattern: '{**,.}/*.test.mocks',
                group: 'unknown',
              },
              {
                pattern: '{@kbn/**,src/**,kibana{,/**}}',
                group: 'internal',
              },
            ],
            pathGroupsExcludedImportTypes: [],
            alphabetize: {
              order: 'asc',
              caseInsensitive: true,
            },
            'newlines-between': 'always',
          },
        ],
      },
    },
    {
      files: [
        'src/platform/plugins/private/interactive_setup/**/*.{ts,tsx}',

        'packages/kbn-mock-idp-plugin/**/*.{ts,tsx}',
        'src/platform/packages/private/kbn-mock-idp-utils/**/*.{ts,tsx}',
        'src/platform/packages/shared/kbn-security-hardening/**/*.{ts,tsx}',
        'src/platform/packages/shared/kbn-user-profile-components/**/*.{ts,tsx}',

        'x-pack/platform/plugins/shared/encrypted_saved_objects/**/*.{ts,tsx}',
        'x-pack/platform/test/encrypted_saved_objects_api_integration/**/*.{ts,tsx}',

        'x-pack/platform/plugins/shared/security/**/*.{ts,tsx}',
        'x-pack/platform/packages/private/security/**/*.{ts,tsx}',
        'x-pack/platform/packages/shared/security/**/*.{ts,tsx}',
        'x-pack/platform/test/security_api_integration/**/*.{ts,tsx}',
        'x-pack/platform/test/security_functional/**/*.{ts,tsx}',

        'x-pack/platform/plugins/shared/spaces/**/*.{ts,tsx}',
        'x-pack/platform/test/spaces_api_integration/**/*.{ts,tsx}',
      ],
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
      plugins: ['eslint-plugin-n', 'react'],
      env: {
        jest: true,
      },
      rules: {
        complexity: 'warn',

        'no-duplicate-imports': 'off',
        'no-implicit-globals': 'error',
        // rely on typescript
        'no-undef': 'off',
        'no-useless-return': 'error',
        'react/boolean-prop-naming': 'error',
        'react/display-name': 'error',
        'react/no-access-state-in-setstate': 'error',
        'react/no-deprecated': 'error',
        'react/no-typos': 'error',
        'react/no-unused-prop-types': 'error',
        'react/no-unused-state': 'error',
        'react/sort-default-props': 'error',
        'react/jsx-no-literals': 'error',
        'require-atomic-updates': 'error',
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
        'import/order': [
          // This rule sorts import declarations
          'error',
          {
            groups: [
              'unknown',
              ['builtin', 'external'],
              'internal',
              ['parent', 'sibling', 'index'],
            ],
            pathGroups: [
              {
                pattern: '{**,.}/*.test.mocks',
                group: 'unknown',
              },
              {
                pattern: '{@kbn/**,src/**,kibana{,/**}}',
                group: 'internal',
              },
            ],
            pathGroupsExcludedImportTypes: [],
            alphabetize: {
              order: 'asc',
              caseInsensitive: true,
            },
          },
        ],
      },
    },
    /**
     * Workflows Team: public and common rules
     */
    {
      files: [
        'src/platform/plugins/shared/workflows_management/public/**/*.{js,mjs,ts,tsx}',
        'src/platform/plugins/shared/workflows_management/common/**/*.{js,mjs,ts,tsx}',
        'src/platform/plugins/shared/workflows_extensions/public/**/*.{js,mjs,ts,tsx}',
        'src/platform/plugins/shared/workflows_extensions/common/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-workflows/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-workflows-ui/**/*.{js,mjs,ts,tsx}',
      ],
      rules: {
        'no-duplicate-imports': 'off',
      },
    },

    /**
     * Cloud Security Team overrides
     */
    {
      files: ['x-pack/solutions/security/plugins/cloud_security_posture/**/*.{js,mjs,ts,tsx}'],
      // `testing-library/*` rules run in oxlint (.oxlint/testing_library.mts); registered for `eslint-disable` directives.
      plugins: ['testing-library'],
    },
    /**
     * Code inside .buildkite runs separately from everything else in CI, before bootstrap, with Node. It needs a few tweaks because of this.
     */
    {
      files: '.buildkite/**/*.{cjs,js,mjs,ts}',
      parserOptions: {
        ecmaVersion: 2022,
      },
    },

    {
      // The OpenAPI generator writes these API client bundles with duplicate and unused imports and
      // relies on these two fixes to clean them up. Both run here, in one ESLint fix pass, so the
      // generator output stays the same on every machine. Oxlint turns both off for these files.
      files: ['x-pack/solutions/security/packages/test-api-clients/{supertest,scout}/*.gen.ts'],
      rules: {
        '@kbn/imports/no_unused_imports': 'error',
        'import/no-duplicates': 'error',
      },
    },

    {
      // @rspack/* packages are pure ESM. Direct value imports work in
      // production (Node require(esm)) but break any Jest test that loads
      // them, so the optimizer must go through its rspack_runtime shim, which
      // loads them natively via createRequire (see rspack_runtime.ts).
      files: [
        'packages/kbn-rspack-optimizer/**/*.{ts,tsx}',
        'packages/kbn-plugin-helpers/src/tasks/optimize.ts',
      ],
      rules: {
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            paths: [
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
      excludedFiles: ['src/platform/packages/shared/kbn-scout/src/**'],
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
          {
            paths: [
              {
                name: '@kbn/scout',
                message:
                  "Observability solution tests should import from '@kbn/scout-oblt' instead.",
              },
              {
                name: '@playwright/test',
                message:
                  "Observability solution tests should import from '@kbn/scout-oblt' instead.",
              },
              {
                name: 'playwright',
                message:
                  "Observability solution tests should import from '@kbn/scout-oblt' instead.",
              },
              ...scoutRestrictedFtrPaths,
            ],
            patterns: [
              {
                group: ['@kbn/scout/**', '@playwright/test/**', 'playwright/**'],
                message:
                  "Observability solution tests should import from '@kbn/scout-oblt' instead.",
              },
              scoutRestrictedFtrPatterns,
            ],
          },
        ],
      },
    },
    {
      files: ['x-pack/solutions/search/**/test/{scout,scout_*}/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '@kbn/scout',
                message: "Search solution tests should import from '@kbn/scout-search' instead.",
              },
              {
                name: '@playwright/test',
                message: "Search solution tests should import from '@kbn/scout-search' instead.",
              },
              {
                name: 'playwright',
                message: "Search solution tests should import from '@kbn/scout-search' instead.",
              },
              ...scoutRestrictedFtrPaths,
            ],
            patterns: [
              {
                group: ['@kbn/scout/**', '@playwright/test/**', 'playwright/**'],
                message: "Search solution tests should import from '@kbn/scout-search' instead.",
              },
              scoutRestrictedFtrPatterns,
            ],
          },
        ],
      },
    },
    {
      files: ['x-pack/solutions/security/**/test/{scout,scout_*}/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '@kbn/scout',
                message:
                  "Security solution tests should import from '@kbn/scout-security' instead.",
              },
              {
                name: '@playwright/test',
                message:
                  "Security solution tests should import from '@kbn/scout-security' instead.",
              },
              {
                name: 'playwright',
                message:
                  "Security solution tests should import from '@kbn/scout-security' instead.",
              },
              ...scoutRestrictedFtrPaths,
            ],
            patterns: [
              {
                group: ['@kbn/scout/**', '@playwright/test/**', 'playwright/**'],
                message:
                  "Security solution tests should import from '@kbn/scout-security' instead.",
              },
              scoutRestrictedFtrPatterns,
            ],
          },
        ],
      },
    },
  ],
};

/**
 * Prettier disables all conflicting rules, listing as last override so it takes precedence
 * people kept ignoring that this was last so it's now defined outside of the overrides list
 */
/** eslint-disable-next-line */
module.exports.overrides.push({ files: ['**/*'], rules: require('eslint-config-prettier').rules });
/** PLEASE DON'T PUT THINGS AFTER THIS */
