// NOTE: This is the configuration to apply the typescript eslint parser
// in order to lint typescript files with eslint.
// Some IDEs could not be running eslint with the correct extensions yet
// as this package was moved from typescript-eslint-parser to @typescript-eslint/parser
//
// As a matter of example in IntelliJ IDEA this would be fixed on 2019.1 release to be launched soon.
// In order to have it working for now, we should add the extensions `ts,tsx` to the option
// `eslint.additional.file.extensions` that can be found on Help > Find Action > Registry
// To read bore about it please visit
// https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000225170-ESLint-and-ts-Typescript-files

const semver = require('semver');
const PKG = require('../../package.json');

// const typescriptEslintRecommendedRules = require('@typescript-eslint/eslint-plugin').configs.recommended.rules;
const eslintConfigPrettierTypescriptEslintRules = require('eslint-config-prettier/@typescript-eslint').rules;

module.exports = {
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      parser: '@typescript-eslint/parser',

      plugins: [
        '@typescript-eslint',
        'prefer-object-spread',
        'jsx-a11y',
      ],

      settings: {
        react: {
          version: semver.valid(semver.coerce(PKG.dependencies.react)),
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
        ecmaFeatures: {
          experimentalObjectRestSpread: true,
          jsx: true
        },
        project: './tsconfig.json'
      },

      // NOTE: we can't override the extends option here to apply
      // all the recommend rules as it is not allowed yet
      // more info on: https://github.com/eslint/rfcs/pull/13 and
      // https://github.com/eslint/eslint/issues/8813
      //
      // For now we are using an workaround to create
      // those extended rules arrays
      rules: Object.assign(
        {},
        eslintConfigPrettierTypescriptEslintRules,
      )
    },
    {
      parserOptions: {
        project: 'x-pack/tsconfig.json'
      },
      files: ['x-pack/**/*.{ts,tsx}'],
    },
  ]
};
