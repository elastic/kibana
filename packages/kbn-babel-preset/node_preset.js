module.exports = {
  presets: [
    [
      require.resolve('babel-preset-env'),
      {
        targets: {
          // only applies the necessary transformations based on the
          // current node.js processes version. For example: running
          // `nvm install 8 && node ./src/cli` will run kibana in node
          // version 8 and babel will stop transpiling async/await
          // because they are supported in the "current" version of node
          node: 'current',
        },

        // replaces `import "babel-polyfill"` with a list of require statements
        // for just the polyfills that the target versions don't already supply
        // on their own
        useBuiltIns: true,
      },
    ],
    require('./common_preset'),
  ],
  plugins: [
    [
      require.resolve('babel-plugin-transform-define'),
      {
        'global.__BUILT_WITH_BABEL__': 'true'
      }
    ]
  ]
};
