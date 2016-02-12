module.exports = function () {

  var vfs = require('vinyl-fs');
  var zip = require('gulp-zip');
  var rename = require('gulp-rename');
  var join = require('path').join;

  var pkg = require('../package.json');
  var deps = Object.keys(pkg.dependencies || {});
  var buildId = `${pkg.name}-${pkg.version}`;

  var files = [
    'package.json',
    'index.js',
    '{lib,public,server,webpackShims}/**/*',
    `node_modules/{${ deps.join(',') }}/**/*`,
  ];

  vfs
    .src(files, { base: join(__dirname, '..') })
    .pipe(rename(function nestFileInDir(path) {
      path.dirname = join(buildId, path.dirname);
    }))
    .pipe(zip(`${buildId}.zip`))
    .pipe(vfs.dest('build'));

};
