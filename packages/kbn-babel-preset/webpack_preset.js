module.exports = {
  presets: [
    [
      require.resolve('babel-preset-env'),
      {
        targets: {
          browsers: [
            'last 2 versions',
            '> 5%',
            'Safari 7', // for PhantomJS support
          ],
        },
        useBuiltIns: true,
      },
    ],
    require('./common_preset'),
  ]
};
