module.exports = {
  overrides: [
    {
      files: [
        '**/*.{test,test.mocks,mock}.{js,ts,tsx}',
        '**/__mocks__/**/*.{js,ts,tsx}',
      ],
      plugins: [
        'jest',
      ],

      env: {
        'jest': true,
      },

      rules: {
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'import/order': 'off'
      },
    }
  ]
};
