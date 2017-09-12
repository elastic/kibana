module.exports = {
  presets: [
    [
      require.resolve('babel-preset-env'),
      {
        targets: {
          node: 'current',
        },
        useBuiltIns: true,
      },
    ],
    require('./common'),
  ],
  plugins: [
    [
      require.resolve('babel-plugin-transform-define'),
      {
        'typeof BUILT_WITH_BABEL': 'true'
      }
    ]
  ]
};
