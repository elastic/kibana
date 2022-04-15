const { USES_STYLED_COMPONENTS } = require('@kbn/babel-preset/styled_components_files');

module.exports = {
  extends: [
    './javascript.js',
    './typescript.js',
    './jest.js',
    './react.js',
  ],

  plugins: [
    '@kbn/eslint-plugin-eslint',
    '@kbn/eslint-plugin-imports',
    'prettier',
  ],

  parserOptions: {
    ecmaVersion: 2018
  },

  env: {
    es6: true,
  },

  rules: {
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],

    '@kbn/eslint/module_migration': [
      'error',
      [
        {
          from: 'expect.js',
          to: '@kbn/expect',
        },
        {
          from: 'mkdirp',
          to: false,
          disallowedMessage: `Don't use 'mkdirp', use the new { recursive: true } option of Fs.mkdir instead`
        },
        {
          from: 'numeral',
          to: '@elastic/numeral',
        },
        {
          from: '@kbn/elastic-idx',
          to: false,
          disallowedMessage: `Don't use idx(), use optional chaining syntax instead https://ela.st/optchain`
        },
        {
          from: 'x-pack',
          toRelative: 'x-pack',
        },
        {
          from: 'react-router',
          to: 'react-router-dom',
        },
        {
          from: '@kbn/ui-shared-deps/monaco',
          to: '@kbn/monaco',
        },
        {
          from: 'monaco-editor',
          to: false,
          disallowedMessage: `Don't import monaco directly, use or add exports to @kbn/monaco`
        },
        {
          from: 'tinymath',
          to: '@kbn/tinymath',
          disallowedMessage: `Don't use 'tinymath', use '@kbn/tinymath'`
        },
        {
          from: '@kbn/test/types/ftr',
          to: '@kbn/test',
          disallowedMessage: `import from the root of @kbn/test instead`
        },
        {
          from: 'react-intl',
          to: '@kbn/i18n-react',
          disallowedMessage: `import from @kbn/i18n-react instead`
        },
        {
          from: 'styled-components',
          to: false,
          exclude: USES_STYLED_COMPONENTS,
          disallowedMessage: `Prefer using @emotion/react instead. To use styled-components, ensure you plugin is enabled in @kbn/dev-utils/src/babel.ts.`
        },
        ...[
          '@elastic/eui/dist/eui_theme_light.json',
          '@elastic/eui/dist/eui_theme_dark.json',
        ].map(from => ({
          from,
          to: false,
          disallowedMessage: `Use "@kbn/ui-theme" to access theme vars.`
        })),
        {
          from: '@kbn/test/jest',
          to: '@kbn/test-jest-helpers',
          disallowedMessage: `import from @kbn/test-jest-helpers instead`
        },
      ],
    ],

    /**
     * ESLint rule to aid with breaking up packages:
     *
     *  `fromPacakge` the package name which was broken up
     *  `toPackage` the package where the removed exports were placed
     *  `exportNames` the list of exports which used to be found in `fromPacakge` and are now found in `toPackage`
     *
     * TODO(@spalger): once packages have types we should be able to filter this rule based on the package type
     *  of the file being linted so that we could re-route imports from `plugin-client` types to a different package
     *  than `plugin-server` types.
     */
    '@kbn/imports/exports_moved_packages': ['error', [
      {
        fromPackage: '@kbn/dev-utils',
        toPackage: '@kbn/tooling-log',
        exportNames: [
          'DEFAULT_LOG_LEVEL',
          'getLogLevelFlagsHelp',
          'LOG_LEVEL_FLAGS',
          'LogLevel',
          'Message',
          'ParsedLogLevel',
          'parseLogLevel',
          'pickLevelFromFlags',
          'ToolingLog',
          'ToolingLogCollectingWriter',
          'ToolingLogOptions',
          'ToolingLogTextWriter',
          'ToolingLogTextWriterConfig',
          'Writer',
        ]
      },
      {
        fromPackage: '@kbn/dev-utils',
        toPackage: '@kbn/ci-stats-reporter',
        exportNames: [
          'CiStatsMetric',
          'CiStatsReporter',
          'CiStatsReportTestsOptions',
          'CiStatsTestGroupInfo',
          'CiStatsTestResult',
          'CiStatsTestRun',
          'CiStatsTestType',
          'CiStatsTiming',
          'getTimeReporter',
          'MetricsOptions',
          'TimingsOptions',
        ]
      },
      {
        fromPackage: '@kbn/dev-utils',
        toPackage: '@kbn/ci-stats-core',
        exportNames: [
          'Config',
        ]
      },
      {
        fromPackage: '@kbn/dev-utils',
        toPackage: '@kbn/ci-stats-client',
        exportNames: [
          'CiStatsClient',
        ]
      },
      {
        fromPackage: '@kbn/dev-utils',
        toPackage: '@kbn/jest-serializers',
        exportNames: [
          'createAbsolutePathSerializer',
          'createStripAnsiSerializer',
          'createRecursiveSerializer',
          'createAnyInstanceSerializer',
          'createReplaceSerializer',
        ]
      },
      {
        fromPackage: '@kbn/dev-utils',
        toPackage: '@kbn/stdio-dev-helpers',
        exportNames: [
          'observeReadable',
          'observeLines',
        ]
      },
      {
        fromPackage: '@kbn/dev-utils',
        toPackage: '@kbn/sort-package-json',
        exportNames: [
          'sortPackageJson',
        ]
      },
    ]],

    '@kbn/eslint/no_async_promise_body': 'error',
    '@kbn/eslint/no_async_foreach': 'error',
    '@kbn/eslint/no_trailing_import_slash': 'error',
    '@kbn/eslint/no_constructor_args_in_property_initializers': 'error',
    '@kbn/eslint/no_this_in_property_initializers': 'error',
    '@kbn/imports/no_unresolvable_imports': 'error',
    '@kbn/imports/uniform_imports': 'error',
  },
};
