'use strict';
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

exports.name = 'concat';

//
// Output a config for the furnished block
// The context variable is used both to take the files to be treated
// (inFiles) and to output the one(s) created (outFiles).
// It also conveys whether or not the current process is the last of the pipe
//
exports.createConfig = function (context, block) {
  var cfg = {
    files: []
  };
  // FIXME: check context has all the needed info
  var outfile = path.join(context.outDir, block.dest);

  // Depending whether or not we're the last of the step we're not going to output the same thing
  var files = {};
  files.dest = outfile;
  files.src = [];

  context.inFiles.forEach(function (f) {
    if (_.isArray(context.inDir)) {
      context.inDir.every(function (d) {
        var joinedPath = path.join(d, f);
        var joinedPathExists = fs.existsSync(joinedPath);
        if (joinedPathExists) {
          files.src.push(joinedPath);
        }
        return !joinedPathExists;
      });
    } else {
      files.src.push(path.join(context.inDir, f));
    }
  });

  cfg.files.push(files);
  context.outFiles = [block.dest];
  return cfg;
};
