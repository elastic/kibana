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
        project: './tsconfig.json'
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
        {
          typescriptEslintRecommendedRules,
          "camelcase": "off",
          '@typescript-eslint/camelcase': [ 'error', { properties: 'never' } ],
          "indent": "off",
          '@typescript-eslint/indent': [ 'error', 2, { SwitchCase: 1 } ],
          "no-unused-vars": "off",
          '@typescript-eslint/no-unused-vars': [ 'error' ],
          'no-use-before-define': 'off',
          '@typescript-eslint/no-use-before-define': 'off',

          "@typescript-eslint/adjacent-overload-signatures": 'off',
          "@typescript-eslint/array-type": 'off',
          "@typescript-eslint/ban-types": "error",
          "@typescript-eslint/class-name-casing": "error",
          "@typescript-eslint/explicit-function-return-type": 'off',
          "@typescript-eslint/explicit-member-accessibility": 'off',
          "@typescript-eslint/interface-name-prefix": "off",
          "@typescript-eslint/member-delimiter-style": "error",
          "@typescript-eslint/no-angle-bracket-type-assertion": "error",
          "no-array-constructor": "off",
          "@typescript-eslint/no-array-constructor": "error",
          "@typescript-eslint/no-empty-interface": "error",
          "@typescript-eslint/no-explicit-any": 'off',
          "@typescript-eslint/no-inferrable-types": "error",
          "@typescript-eslint/no-misused-new": "error",
          "@typescript-eslint/no-namespace": "error",
          "@typescript-eslint/no-non-null-assertion": 'off',
          "@typescript-eslint/no-object-literal-type-assertion": "error",
          "@typescript-eslint/no-parameter-properties": "off",
          "@typescript-eslint/no-triple-slash-reference": "error",
          "@typescript-eslint/no-var-requires": "offr",
          "@typescript-eslint/prefer-interface": "error",
          "@typescript-eslint/prefer-namespace-keyword": "error",
          "@typescript-eslint/type-annotation-spacing": "error"
        },
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
