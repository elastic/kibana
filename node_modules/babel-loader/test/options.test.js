'use strict';

var fs = require('fs');
var path = require('path');
var assign = require('object-assign');
var expect = require('expect.js');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var webpack = require('webpack');

describe('Options', function() {

  var outputDir = path.resolve(__dirname, './output/options');
  var babelLoader = path.resolve(__dirname, '../');
  var globalConfig = {
    entry: './test/fixtures/basic.js',
    output: {
      path: outputDir,
      filename: '[id].options.js',
    },
    module: {
      loaders: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
        },
      ],
    },
  };

  // Clean generated cache files before each test
  // so that we can call each test with an empty state.
  beforeEach(function(done) {
    rimraf(outputDir, function(err) {
      if (err) { return done(err); }
      mkdirp(outputDir, done);
    });
  });

  it('should interpret options given to the loader', function(done) {
    var config = assign({}, globalConfig, {
      entry: './test/fixtures/experimental.js',
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader + '?stage=0',
            exclude: /node_modules/,
          },
        ],
      },
    });

    webpack(config, function(err, stats) {
      expect(err).to.be(null);

      fs.readdir(outputDir, function(err, files) {
        expect(err).to.be(null);
        expect(files).to.not.be.empty();

        done();
      });
    });
  });

  it('should interpret options given globally', function(done) {

    var config = assign({}, globalConfig, {
      entry: './test/fixtures/experimental.js',
      babel: {
        stage: 0,
      },
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
          },
        ],
      },
    });

    webpack(config, function(err, stats) {
      expect(err).to.be(null);

      fs.readdir(outputDir, function(err, files) {
        expect(err).to.be(null);
        expect(files).to.not.be.empty();

        done();
      });
    });
  });

  it('should give priority to loader options', function(done) {
    var config = assign({}, globalConfig, {
      entry: './test/fixtures/experimental.js',
      babel: {
        stage: 4,
      },
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader + '?stage=0',
            exclude: /node_modules/,
          },
        ],
      },
    });

    webpack(config, function(err, stats) {
      expect(err).to.be(null);

      fs.readdir(outputDir, function(err, files) {
        expect(err).to.be(null);
        expect(files).to.not.be.empty();

        done();
      });
    });
  });

});
