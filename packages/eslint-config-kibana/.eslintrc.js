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
    ecmaVersion: 6
  },

  env: {
    es6: true
  },

  rules: Object.assign(
    {
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
        ],
      ],
    },
    require('eslint-config-prettier').rules,
    require('eslint-config-prettier/react').rules
  )
};
