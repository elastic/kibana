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

const typescriptEslintRecommendedRules = require('@typescript-eslint/eslint-plugin').configs.recommended.rules;
const eslintConfigPrettierTypescriptEslintRules = require('eslint-config-prettier/@typescript-eslint').rules;

module.exports = {
  overrides: [
    {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      files: ['**/*.{ts,tsx}'],
      plugins: ['@typescript-eslint'],
      // NOTE: we can't override the extends option here to apply
      // all the recommend rules as it is not allowed yet
      // more info on: https://github.com/eslint/rfcs/pull/13 and
      // https://github.com/eslint/eslint/issues/8813
      //
      // For now we are using an workaround to create
      // those extended rules arrays
      rules: Object.assign(
        typescriptEslintRecommendedRules,
        {
          "@typescript-eslint/camelcase": [ 'error', { properties: 'never' } ],
          "@typescript-eslint/indent": [ 'error', 2, { SwitchCase: 1 } ],
          "@typescript-eslint/no-unused-vars": [ 'error' ],
          "@typescript-eslint/no-use-before-define": [ 'error', 'nofunc' ],
          "@typescript-eslint/explicit-function-return-type": false,
          "@typescript-eslint/no-explicit-any": false,
        },
        eslintConfigPrettierTypescriptEslintRules,
      )
    },
  ]
};
