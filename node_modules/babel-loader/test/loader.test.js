'use strict';

var fs = require('fs');
var path = require('path');
var assign = require('object-assign');
var expect = require('expect.js');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var webpack = require('webpack');

describe('Loader', function() {

  var outputDir = path.resolve(__dirname, './output/loader');
  var babelLoader = path.resolve(__dirname, '../');
  var globalConfig = {
    entry: './test/fixtures/basic.js',
    output: {
      path: outputDir,
      filename: '[id].loader.js',
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

  it('should transpile the code snippet', function(done) {
    var config = assign({}, globalConfig, {
      entry: './test/fixtures/basic.js',
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
        expect(files.length).to.equal(1);
        fs.readFile(path.resolve(outputDir, files[0]), function(err, data) {
          var test = 'var App = function App()';
          var subject = data.toString();

          expect(err).to.be(null);
          expect(subject.indexOf(test)).to.not.equal(-1);

          return done();
        });
      });
    });
  });

  it('should not throw error on syntax error', function(done) {
    var config = assign({}, globalConfig, {
      entry: './test/fixtures/syntax.js',
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
      expect(stats.compilation.errors).to.have.length();
      expect(stats.compilation.errors[0]).to.be.an(Error);

      return done();
    });

  });

});
