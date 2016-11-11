module.exports = function (plugin) {

  var vfs = require('vinyl-fs');
  var zip = require('gulp-zip');
  var rename = require('gulp-rename');
  var join = require('path').join;

  var deps = Object.keys(plugin.pkg.dependencies || {});
  var buildId = `${plugin.id}-${plugin.version}`;

  var files = [
    'package.json',
    'index.js',
    '{lib,public,server,webpackShims}/**/*'
  ];

  if (deps.length === 1) {
    files.push(`node_modules/${ deps[0] }/**/*`);
  } else {
    files.push(`node_modules/{${ deps.join(',') }}/**/*`);
  }

  vfs
    .src(files, { base: plugin.root })
    .pipe(rename(function nestFileInDir(path) {
      path.dirname = join('kibana', plugin.id, path.dirname);
    }))
    .pipe(zip(`${buildId}.zip`))
    .pipe(vfs.dest(join(plugin.root, 'build')));

};
