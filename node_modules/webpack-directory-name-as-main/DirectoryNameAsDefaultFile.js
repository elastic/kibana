/* jshint node:true, esnext:true */

/*****
 * Modified clone of https://github.com/webpack/enhanced-resolve/blob/3b88905ad3cb6392f48f7bc57d351891774fd93b/lib/DirectoryDefaultFilePlugin.js
 *****

/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
var basename = require('path').basename;

function DirectoryDefaultFilePlugin(files) {}
module.exports = DirectoryDefaultFilePlugin;

DirectoryDefaultFilePlugin.prototype.apply = function (resolver) {
  resolver.plugin('directory', function (req, done) {
    var directory = resolver.join(req.path, req.request);

    resolver.fileSystem.stat(directory, function (err, stat) {
      if (err || !stat) return done();
      if (!stat.isDirectory()) return done();

      resolver.doResolve('file', {
        path: req.path,
        query: req.query,
        request: resolver.join(directory, basename(directory))
      }, function (err, result) {
        return done(undefined, result || undefined);
      });
    });

  });
};
