const join = require('path').join;
const relative = require('path').relative;
const del = require('del');
const vfs = require('vinyl-fs');
const zip = require('gulp-zip');

module.exports = function createPackage(plugin, buildVersion) {
  const buildId = `${plugin.id}-${buildVersion}`;
  const buildTarget = join(plugin.root, 'build');
  const buildRoot = join(buildTarget, 'kibana', plugin.id);

  // zip up the package
  return new Promise(function (resolve, reject) {
    const buildFiles = [relative(buildTarget, buildRoot) + '/**/*'];

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