const babelRules = require('./rules/babel');
const importRules = require('./rules/import');
const objectSpreadRules = require('./rules/object_spread');

module.exports = function(options) {
  return Object.assign(
    {
      plugins: [
        'babel',
        'react',
        'import',
        'no-unsanitized',
        'prefer-object-spread',
      ],

      env: {
        es6: true,
        browser: true,
        commonjs: true,
      },

      rules: Object.assign(
        {
          'jsx-quotes': ['error', 'prefer-double'],
          'react/jsx-uses-react': 'error',
          'react/react-in-jsx-scope': 'error',
          'react/jsx-uses-vars': 'error',
          'react/jsx-no-undef': 'error',
          'react/jsx-pascal-case': 'error',
          'react/jsx-closing-bracket-location': ['error', 'line-aligned'],
          'react/jsx-closing-tag-location': 'error',
          'react/jsx-curly-spacing': [
            'error',
            'never',
            { allowMultiline: true },
          ],
          'react/jsx-indent-props': ['error', 2],
          'react/jsx-max-props-per-line': [
            'error',
            { maximum: 1, when: 'multiline' },
          ],
          'react/jsx-no-duplicate-props': ['error', { ignoreCase: true }],
          'react/self-closing-comp': 'error',
          'react/jsx-wrap-multilines': [
            'error',
            {
              declaration: true,
              assignment: true,
              return: true,
              arrow: true,
            },
          ],
          'react/jsx-first-prop-new-line': ['error', 'multiline-multiprop'],
          'react/jsx-equals-spacing': ['error', 'never'],
          'react/jsx-indent': ['error', 2],
          'react/no-did-mount-set-state': 'error',
          'react/no-did-update-set-state': 'error',
          'react/no-will-update-set-state': 'error',
          'react/no-is-mounted': 'error',
          'react/no-multi-comp': ['error', { ignoreStateless: true }],
          'react/no-unknown-property': 'error',
          'react/prefer-es6-class': ['error', 'always'],
          'react/prefer-stateless-function': [
            'error',
            { ignorePureComponents: true },
          ],
          'react/no-unescaped-entities': 'error',
          'no-unsanitized/method': 'error',
          'no-unsanitized/property': 'error',
        },
        babelRules,
        importRules,
        objectSpreadRules
      ),
    },
    options
  );
};
