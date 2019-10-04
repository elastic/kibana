module.exports = {
  extends: [
    './javascript.js',
    './typescript.js',
    './jest.js',
  ],
  plugins: ['@kbn/eslint-plugin-eslint'],

  parserOptions: {
    ecmaVersion: 2018
  },

  env: {
    es6: true,
  },

  rules: {
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
          from: 'x-pack',
          toRelative: 'x-pack',
        },
      ],
    ],
  }
};
