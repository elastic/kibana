var express = require('express');
var instrumentationMiddleware = require('./_instrumentation');
var amdRapperMiddleware = require('./_amd_rapper');

var glob = require('glob');
var path = require('path');
var join = path.join;
var rel = join.bind(null, __dirname);
var ROOT = rel('../../../');
var SRC = join(ROOT, 'src');
var NODE_MODULES = join(ROOT, 'node_modules');
var APP = join(SRC, 'kibana');
var TEST = join(ROOT, 'test');

module.exports = function (app) {
  app.use(instrumentationMiddleware({
    root: SRC,
    displayRoot: SRC,
    filter: function (filename) {
      return filename.match(/.*\/src\/.*\.js$/)
        && !filename.match(/.*\/src\/kibana\/bower_components\/.*\.js$/)
        && !filename.match(/.*\/src\/kibana\/utils\/(event_emitter|next_tick|rison)\.js$/);
    }
  }));

  app.use(instrumentationMiddleware({
    root: APP,
    displayRoot: SRC,
    filter: function (filename) {
      return filename.match(/.*\/src\/.*\.js$/)
        && !filename.match(/.*\/src\/kibana\/bower_components\/.*\.js$/)
        && !filename.match(/.*\/src\/kibana\/utils\/(event_emitter|next_tick|rison)\.js$/);
    }
  }));

  app.use(amdRapperMiddleware({
    root: ROOT
  }));

  app.use('/test', express.static(TEST));
  app.use('/src', express.static(SRC));
  app.use('/node_modules', express.static(NODE_MODULES));
  app.use('/specs', function (req, res) {
    var unit = join(ROOT, '/test/unit/');
    glob(join(unit, 'specs/**/*.js'), function (er, files) {
      var moduleIds = files
      .filter(function (filename) {
        return path.basename(filename).charAt(0) !== '_';
      })
      .map(function (filename) {
        return path.relative(unit, filename).replace(/\.js$/, '');
      });

      res.end(JSON.stringify(moduleIds));
    });
  });
};
