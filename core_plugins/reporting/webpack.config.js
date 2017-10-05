const path = require('path');

module.exports = {
  entry: ['./src/index.ts'],

  target: 'node',

  resolve: {
    extensions: ['.ts', '.js']
  },

  output: {
    path: path.resolve(__dirname, 'target', 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2'
  },

  externals: ['lodash', 'rxjs'],

  devtool: 'source-map',

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'awesome-typescript-loader'
          }
        ]
      }
    ]
  }
};
