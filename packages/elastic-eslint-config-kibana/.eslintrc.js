module.exports = {
  extends: [
    './javascript.js',
    './typescript.js',
    './jest.js',
    './react.js',
  ],

  plugins: [
    '@kbn/eslint-plugin-eslint',
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
      ],
    ],
  },
};
