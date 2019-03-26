const semver = require('semver');
const { resolve } = require('path');
const { readdirSync } = require('fs');
const PKG = require('../../package.json');
const RESTRICTED_GLOBALS = require('./restricted_globals');
const RESTRICTED_MODULES = { paths: ['gulp-util'] };

module.exports = {
  overrides: [
    /**
     * Main JS configuration
     */
    {
      files: ['**/*.js'],
      parser: 'babel-eslint',

      plugins: [
        'mocha',
        'babel',
        'react',
        'import',
        'no-unsanitized',
        'prefer-object-spread',
        'jsx-a11y',
      ],

      settings: {
        react: {
          version: semver.valid(semver.coerce(PKG.dependencies.react)),
        },
        'import/resolver': {
          '@kbn/eslint-import-resolver-kibana': {
            forceNode: true,
          },
        },
      },

      env: {
        es6: true,
        node: true,
        mocha: true,
        browser: true,
      },

      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 6,
        ecmaFeatures: { experimentalObjectRestSpread: true },
      },

      rules: {
        'block-scoped-var': 'error',
        camelcase: [ 'error', { properties: 'never' } ],
        'comma-dangle': 'off',
        'comma-spacing': ['error', { before: false, after: true }],
        'comma-style': [ 'error', 'last' ],
        'consistent-return': 'off',
        curly: [ 'error', 'multi-line' ],
        'dot-location': [ 'error', 'property' ],
        'dot-notation': [ 'error', { allowKeywords: true } ],
        eqeqeq: [ 'error', 'allow-null' ],
        'guard-for-in': 'error',
        indent: [ 'error', 2, { SwitchCase: 1 } ],
        'key-spacing': ['error', { beforeColon: false, afterColon: true }],
        'max-len': [ 'error', 140, 2, { ignoreComments: true, ignoreUrls: true } ],
        'new-cap': [ 'error', { capIsNewExceptions: [ 'Private' ] } ],
        'no-bitwise': 'off',
        'no-caller': 'error',
        'no-cond-assign': 'off',
        'no-const-assign': 'error',
        'no-debugger': 'error',
        'no-empty': 'error',
        'no-eval': 'error',
        'no-extend-native': 'error',
        'no-extra-parens': 'off',
        'no-extra-semi': [ 'error' ],
        'no-global-assign': 'error',
        'no-irregular-whitespace': 'error',
        'no-iterator': 'error',
        'no-loop-func': 'error',
        'no-multi-spaces': 'off',
        'no-multi-str': 'off',
        'no-nested-ternary': 'error',
        'no-new': 'off',
        'no-path-concat': 'off',
        'no-proto': 'error',
        'no-redeclare': 'error',
        'no-restricted-globals': ['error', ...RESTRICTED_GLOBALS],
        'no-restricted-imports': [2, RESTRICTED_MODULES],
        'no-restricted-modules': [2, RESTRICTED_MODULES],
        'no-return-assign': 'off',
        'no-script-url': 'error',
        'no-sequences': 'error',
        'no-shadow': 'off',
        'no-trailing-spaces': 'error',
        'no-undef': 'error',
        'no-underscore-dangle': 'off',
        'no-unsanitized/method': 'error',
        'no-unsanitized/property': 'error',
        'no-unused-expressions': 'off',
        'no-unused-vars': [ 'error' ],
        'no-use-before-define': [ 'error', 'nofunc' ],
        'no-var': 'error',
        'no-with': 'error',
        'one-var': [ 'error', 'never' ],
        'prefer-const': 'error',
        quotes: [ 'error', 'single', { allowTemplateLiterals: true } ],
        'semi-spacing': [ 'error', { before: false, after: true } ],
        semi: [ 'error', 'always' ],
        'space-before-blocks': [ 'error', 'always' ],
        'space-before-function-paren': [ 'error', { anonymous: 'always', named: 'never' } ],
        'space-in-parens': [ 'error', 'never' ],
        'space-infix-ops': [ 'error', { int32Hint: false } ],
        'space-unary-ops': [ 'error' ],
        strict: [ 'error', 'never' ],
        'valid-typeof': 'error',
        'wrap-iife': [ 'error', 'outside' ],
        'eol-last': ['error', 'always'],
        yoda: 'off',

        'object-curly-spacing': 'off', // overridden with babel/object-curly-spacing
        'babel/object-curly-spacing': [ 'error', 'always' ],

        'jsx-quotes': ['error', 'prefer-double'],
        'react/jsx-uses-react': 'error',
        'react/react-in-jsx-scope': 'error',
        'react/jsx-uses-vars': 'error',
        'react/jsx-no-undef': 'error',
        'react/jsx-pascal-case': 'error',
        'react/jsx-closing-bracket-location': ['error', 'line-aligned'],
        'react/jsx-closing-tag-location': 'error',
        'react/jsx-curly-spacing': ['error', 'never', { allowMultiline: true }],
        'react/jsx-indent-props': ['error', 2],
        'react/jsx-max-props-per-line': ['error', { maximum: 1, when: 'multiline' }],
        'react/jsx-no-duplicate-props': ['error', { ignoreCase: true }],
        'react/no-danger': 'error',
        'react/self-closing-comp': 'error',
        'react/jsx-wrap-multilines': ['error', {
          declaration: true,
          assignment: true,
          return: true,
          arrow: true,
        }],
        'react/jsx-first-prop-new-line': ['error', 'multiline-multiprop'],
        'jsx-a11y/accessible-emoji': 'error',
        'jsx-a11y/alt-text': 'error',
        'jsx-a11y/anchor-has-content': 'error',
        'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
        'jsx-a11y/aria-props': 'error',
        'jsx-a11y/aria-proptypes': 'error',
        'jsx-a11y/aria-role': 'error',
        'jsx-a11y/aria-unsupported-elements': 'error',
        'jsx-a11y/heading-has-content': 'error',
        'jsx-a11y/html-has-lang': 'error',
        'jsx-a11y/iframe-has-title': 'error',
        'jsx-a11y/interactive-supports-focus': 'error',
        'jsx-a11y/media-has-caption': 'error',
        'jsx-a11y/mouse-events-have-key-events': 'error',
        'jsx-a11y/no-access-key': 'error',
        'jsx-a11y/no-distracting-elements': 'error',
        'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
        'jsx-a11y/no-noninteractive-element-interactions': 'error',
        'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
        'jsx-a11y/no-redundant-roles': 'error',
        'jsx-a11y/role-has-required-aria-props': 'error',
        'jsx-a11y/role-supports-aria-props': 'error',
        'jsx-a11y/scope': 'error',
        'jsx-a11y/tabindex-no-positive': 'error',
        'jsx-a11y/label-has-associated-control': 'error',
        'react/jsx-equals-spacing': ['error', 'never'],
        'react/jsx-indent': ['error', 2],
        'react/no-will-update-set-state': 'error',
        'react/no-is-mounted': 'error',
        'react/no-multi-comp': ['error', { ignoreStateless: true }],
        'react/no-unknown-property': 'error',
        'react/prefer-es6-class': ['error', 'always'],
        'react/prefer-stateless-function': ['error', { ignorePureComponents: true }],
        'react/no-unescaped-entities': 'error',

        'mocha/handle-done-callback': 'error',
        'mocha/no-exclusive-tests': 'error',

        'import/no-unresolved': [ 'error', { 'amd': true, 'commonjs': true } ],
        'import/named': 'error',
        'import/namespace': 'error',
        'import/default': 'error',
        'import/export': 'error',
        'import/no-named-as-default': 'error',
        'import/no-named-as-default-member': 'error',
        'import/no-duplicates': 'error',
        'import/no-dynamic-require': 'error',

        'prefer-object-spread/prefer-object-spread': 'error',
      }
    },

    /**
     * Allow default exports
     */
    {
      files: ['x-pack/test/functional/apps/**/*.js', 'x-pack/plugins/apm/**/*.js'],
      rules: {
        '@kbn/eslint/no-default-export': 'off',
        'import/no-named-as-default': 'off',
      },
    },

    /**
     * Files that are allowed to import webpack-specific stuff
     */
    {
      files: [
        '**/public/**/*.js',
        '**/webpackShims/**/*.js',
        'packages/kbn-ui-framework/doc_site/src/**/*.js',
        'src/fixtures/**/*.js', // TODO: this directory needs to be more obviously "public" (or go away)
      ],
      settings: {
        // instructs import/no-extraneous-dependencies to treat modules
        // in plugins/ or ui/ namespace as "core modules" so they don't
        // trigger failures for not being listed in package.json
        'import/core-modules': ['plugins', 'legacy/ui', 'uiExports'],

        'import/resolver': {
          '@kbn/eslint-import-resolver-kibana': {
            forceNode: false,
            rootPackageName: 'kibana',
            kibanaPath: '.',
            pluginMap: readdirSync(resolve(__dirname, '../../x-pack/plugins')).reduce((acc, name) => {
              if (!name.startsWith('_')) {
                acc[name] = `x-pack/plugins/${name}`;
              }
              return acc;
            }, {}),
          },
        },
      },
    },

    /**
     * Files that ARE NOT allowed to use devDependencies
     */
    {
      files: ['packages/kbn-ui-framework/**/*.js', 'x-pack/**/*.js', 'packages/kbn-interpreter/**/*.js'],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: false,
            peerDependencies: true,
          },
        ],
      },
    },

    /**
     * Files that ARE allowed to use devDependencies
     */
    {
      files: [
        'packages/kbn-ui-framework/**/*.test.js',
        'packages/kbn-ui-framework/doc_site/**/*.js',
        'packages/kbn-ui-framework/generator-kui/**/*.js',
        'packages/kbn-ui-framework/Gruntfile.js',
        'packages/kbn-es/src/**/*.js',
        'packages/kbn-interpreter/tasks/**/*.js',
        'packages/kbn-interpreter/src/plugin/**/*.js',
        'x-pack/{dev-tools,tasks,scripts,test,build_chromium}/**/*.js',
        'x-pack/**/{__tests__,__test__,__jest__,__fixtures__,__mocks__}/**/*.js',
        'x-pack/**/*.test.js',
        'x-pack/test_utils/**/*',
        'x-pack/gulpfile.js',
        'x-pack/plugins/apm/public/utils/testHelpers.js',
      ],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
            peerDependencies: true,
          },
        ],
      },
    },

    /**
     * Files that run BEFORE node version check
     */
    {
      files: ['scripts/**/*.js', 'src/setup_node_env/**/*.js'],
      rules: {
        'import/no-commonjs': 'off',
        'prefer-object-spread/prefer-object-spread': 'off',
        'no-var': 'off',
        'prefer-const': 'off',
        'prefer-destructuring': 'off',
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
        'test/functional/services/lib/web_element_wrapper/scroll_into_view_if_necessary.js',
        '**/browser_exec_scripts/**/*.js',
      ],
      rules: {
        'prefer-object-spread/prefer-object-spread': 'off',
        'no-var': 'off',
        'prefer-const': 'off',
        'prefer-destructuring': 'off',
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
        '**/webpackShims/**/*.js',
        'packages/kbn-plugin-generator/**/*.js',
        'packages/kbn-plugin-helpers/**/*.js',
        'packages/kbn-eslint-import-resolver-kibana/**/*.js',
        'packages/kbn-eslint-plugin-license-header/**/*.js',
        'x-pack/gulpfile.js',
        'x-pack/dev-tools/mocha/setup_mocha.js',
        'x-pack/scripts/*.js',
      ],
      rules: {
        'import/no-commonjs': 'off',
        'prefer-object-spread/prefer-object-spread': 'off',
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
     * APM overrides
     */
    {
      files: ['x-pack/plugins/apm/**/*.js'],
      rules: {
        'no-unused-vars': ['error', { ignoreRestSiblings: true }],
        'no-console': ['warn', { allow: ['error'] }],
      },
    },

    /**
     * GIS overrides
     */
    {
      files: ['x-pack/plugins/maps/**/*.js'],
      rules: {
        'react/prefer-stateless-function': [0, { ignorePureComponents: false }],
      },
    },

    /**
     * Graph overrides
     */
    {
      files: ['x-pack/plugins/graph/**/*.js'],
      globals: {
        angular: true,
        $: true,
      },
      rules: {
        'block-scoped-var': 'off',
        camelcase: 'off',
        eqeqeq: 'off',
        'guard-for-in': 'off',
        'new-cap': 'off',
        'no-loop-func': 'off',
        'no-redeclare': 'off',
        'no-shadow': 'off',
        'no-unused-vars': 'off',
        'one-var': 'off',
      },
    },

    /**
     * ML overrides
     */
    {
      files: ['x-pack/plugins/ml/**/*.js'],
      rules: {
        'no-shadow': 'error',
      },
    },

    /**
     * disable jsx-a11y for kbn-ui-framework
     */
    {
      files: ['packages/kbn-ui-framework/**/*.js'],
      rules: {
        'jsx-a11y/click-events-have-key-events': 'off',
        'jsx-a11y/anchor-has-content': 'off',
        'jsx-a11y/tabindex-no-positive': 'off',
        'jsx-a11y/label-has-associated-control': 'off',
        'jsx-a11y/aria-role': 'off',
      },
    },

    /**
     * Monitoring overrides
     */
    {
      files: ['x-pack/plugins/monitoring/**/*.js'],
      rules: {
        'block-spacing': ['error', 'always'],
        curly: ['error', 'all'],
        'no-unused-vars': ['error', { args: 'all', argsIgnorePattern: '^_' }],
        'no-else-return': 'error',
      },
    },
    {
      files: ['x-pack/plugins/monitoring/public/**/*.js'],
      env: { browser: true },
    },

    /**
     * Canvas overrides
     */
    {
      files: ['x-pack/plugins/canvas/**/*.js'],
      rules: {
        radix: 'error',
        curly: ['error', 'all'],

        // module importing
        'import/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          },
        ],
        'import/extensions': ['error', 'never', { json: 'always', less: 'always', svg: 'always' }],

        // react
        'react/no-did-mount-set-state': 'error',
        'react/no-did-update-set-state': 'error',
        'react/no-multi-comp': ['error', { ignoreStateless: true }],
        'react/self-closing-comp': 'error',
        'react/sort-comp': 'error',
        'react/jsx-boolean-value': 'error',
        'react/jsx-wrap-multilines': 'error',
        'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
        'react/forbid-elements': [
          'error',
          {
            forbid: [
              {
                element: 'EuiConfirmModal',
                message: 'Use <ConfirmModal> instead',
              },
              {
                element: 'EuiPopover',
                message: 'Use <Popover> instead',
              },
              {
                element: 'EuiIconTip',
                message: 'Use <TooltipIcon> instead',
              },
            ],
          },
        ],
      },
    },
    {
      files: [
        'x-pack/plugins/canvas/gulpfile.js',
        'x-pack/plugins/canvas/scripts/*.js',
        'x-pack/plugins/canvas/tasks/*.js',
        'x-pack/plugins/canvas/tasks/**/*.js',
        'x-pack/plugins/canvas/__tests__/**/*.js',
        'x-pack/plugins/canvas/**/{__tests__,__test__,__jest__,__fixtures__,__mocks__}/**/*.js',
      ],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
            peerDependencies: true,
          },
        ],
      },
    },
    {
      files: ['x-pack/plugins/canvas/canvas_plugin_src/**/*.js'],
      globals: { canvas: true, $: true },
      rules: {
        'import/no-unresolved': [
          'error',
          {
            ignore: ['!!raw-loader.+.svg$'],
          },
        ],
      },
    },
    {
      files: ['x-pack/plugins/canvas/public/**/*.js'],
      env: {
        browser: true,
      },
    },
    {
      files: ['x-pack/plugins/canvas/canvas_plugin_src/lib/flot-charts/**/*.js'],
      env: {
        jquery: true,
      },
    },
  ]
};
