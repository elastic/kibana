const Path = require('path')

const { REPO_ROOT } = require('@kbn/dev-utils')

module.exports = {
  extends: [
    './javascript.js',
    './typescript.js',
    './jest.js',
    './react.js',
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
          from: Path.resolve(REPO_ROOT, 'src'),
          filter: (node) => /^((\.\/)|(\.\.\/)+)src\//.test(node.value) && (node.parent.type === 'ImportDeclaration' || node.parent.type.startsWith('Export')),
          to: 'src'
        },
        {
          from: Path.resolve(REPO_ROOT, 'x-pack'),
          filter: (node) => /^((\.\/)|(\.\.\/)+)x-pack\//.test(node.value) && (node.parent.type === 'ImportDeclaration' || node.parent.type.startsWith('Export')),
          to: 'x-pack'
        },
      ],
    ],
  }
};
