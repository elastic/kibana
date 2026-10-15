const semver = require('semver');
const { PKG_JSON } = require('@kbn/repo-info');

module.exports = {
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
  ],

  parserOptions: {
    ecmaFeatures: {
      jsx: true
    }
  },

  settings: {
    react: {
      version: semver.valid(semver.coerce(PKG_JSON.dependencies.react)),
    },
  },

  rules: {
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/jsx-no-duplicate-props': ['error', { ignoreCase: true }],
    'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
    'react-hooks/exhaustive-deps': 'error', // Checks effect dependencies
    'jsx-a11y/accessible-emoji': 'error',
    'jsx-a11y/no-noninteractive-element-interactions': 'error',
    'react/prefer-stateless-function': ['error', { ignorePureComponents: true }],
  },
}
