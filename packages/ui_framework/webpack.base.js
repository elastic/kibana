const babelPreset = {
  presets: [
    [require.resolve('babel-preset-env'), {
      targets: {
        browsers: [
          'last 2 versions',
          '> 5%',
          'Safari 7' // for PhantomJS support
        ]
      },
      useBuiltIns: true,
    }],
    {
      presets: [
        require.resolve('babel-preset-react')
      ],
      plugins: [
        require.resolve('babel-plugin-add-module-exports'),
        // stage 3
        require.resolve('babel-plugin-transform-async-generator-functions'),
        require.resolve('babel-plugin-transform-object-rest-spread'),
        // stage 2
        require.resolve('babel-plugin-transform-class-properties'),
      ],
    },
  ],
};

module.exports = {
  // These are necessasry for using Enzyme with Webpack (https://github.com/airbnb/enzyme/blob/master/docs/guides/webpack.md).
  externals: {
    'react/lib/ExecutionEnvironment': true,
    'react/lib/ReactContext': true,
    'react/addons': true,
  },

  module: {
    loaders: [{
      test: /\.json$/,
      loader: 'json-loader',
    }, {
      test: /\.js$/,
      loader: 'babel',
      exclude: /node_modules/,
      query: {
        presets: [babelPreset],
      },
    }, {
      test: /\.scss$/,
      loaders: ['style', 'css', 'postcss', 'sass'],
      exclude: /node_modules/
    }, {
      test: /\.html$/,
      loader: 'html',
      exclude: /node_modules/
    }, {
      test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/,
      loader: 'file',
    }, {
      test: require.resolve('jquery'),
      loader: 'expose?jQuery!expose?$'
    }]
  }
};
