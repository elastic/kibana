var join = require('path').join;
var relative = require('path').relative;
var del = require('del');
var vfs = require('vinyl-fs');
var zip = require('gulp-zip');

module.exports = function createBuild(plugin, buildVersion) {
  var buildId = `${plugin.id}-${buildVersion}`;
  var buildSource = plugin.root;
  var buildTarget = join(plugin.root, 'build');
  var buildRoot = join(buildTarget, 'kibana', plugin.id);

  // zip up the package
  return new Promise(function (resolve, reject) {
    var buildFiles = [relative(buildTarget, buildRoot) + '/**/*'];

    vfs.src(buildFiles, { cwd: buildTarget, base: buildTarget })
      .pipe(zip(`${buildId}.zip`))
      .pipe(vfs.dest(buildTarget))
      .on('end', resolve)
      .on('error', reject);
  })
  .then(function () {
    // clean up the build path
    return del(join(buildTarget, 'kibana'));
  });
};