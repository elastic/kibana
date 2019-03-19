// NOTE: this is the configuration to apply the typescript eslint parser
// in order to lint typescript files with eslint.
// Some IDEs could not yet ran eslint with the correct extensions
// as this package was moved from typescript-eslint-parser to @typescript-eslint/parser
//
// For example in IntelliJ this would be fixed on 2019.1 to be launched soon.
// In order to have it working now we should add the extensions `ts,tsx` to the option
// `eslint.additional.file.extensions` that can be found on Help > Find Action > Registry
// More info: https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000225170-ESLint-and-ts-Typescript-files

const typescriptEslintRecommended = require('@typescript-eslint/eslint-plugin').configs.recommended;
const eslintConfigPrettierTypescriptEslintRules = require('eslint-config-prettier/@typescript-eslint').rules;

// Remove every non @typescript-eslint rules from typescript eslint plugin recommended rules
const typescriptEslintRecommendedSanitizedRules = Object.keys(typescriptEslintRecommended.rules)
  .filter((key) => !!key.includes('@typescript-eslint'))
  .reduce((obj, key) => ({ ...obj, [key]: typescriptEslintRecommended.rules[key] }), {});

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
        typescriptEslintRecommendedSanitizedRules,
        {
          "@typescript-eslint/adjacent-overload-signatures": "error",
          "@typescript-eslint/array-type": "error",
          "@typescript-eslint/ban-types": "error",
          "@typescript-eslint/class-name-casing": "error",
          "@typescript-eslint/indent": "error",
          "@typescript-eslint/interface-name-prefix": "error",
          "@typescript-eslint/member-delimiter-style": "error",
          "@typescript-eslint/no-angle-bracket-type-assertion": "error",
          "@typescript-eslint/no-array-constructor": "error",
          "@typescript-eslint/no-empty-interface": "error",
          "@typescript-eslint/no-inferrable-types": "error",
          "@typescript-eslint/no-misused-new": "error",
          "@typescript-eslint/no-namespace": "error",
          "@typescript-eslint/no-non-null-assertion": "error",
          "@typescript-eslint/no-object-literal-type-assertion": "error",
          "@typescript-eslint/no-parameter-properties": "error",
          "@typescript-eslint/no-triple-slash-reference": "error",
          "@typescript-eslint/no-unused-vars": "warn",
          "@typescript-eslint/no-var-requires": "error",
          "@typescript-eslint/prefer-interface": "error",
          "@typescript-eslint/prefer-namespace-keyword": "error",
          "@typescript-eslint/type-annotation-spacing": "error"
        },
        eslintConfigPrettierTypescriptEslintRules,
      )
    },
  ]
};
