const path = require('path');

module.exports = {
  entry: ['./index.js'],

  target: 'node',

  output: {
    path: path.resolve(__dirname, 'target'),
    filename: 'index.js',
    libraryTarget: 'commonjs2'
  }
};
