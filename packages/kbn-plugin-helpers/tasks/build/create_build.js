const join = require('path').join;
const relative = require('path').relative;
const statSync = require('fs').statSync;
const execFileSync = require('child_process').execFileSync;
const del = require('del');
const vfs = require('vinyl-fs');
const rename = require('gulp-rename');

const rewritePackageJson = require('./rewrite_package_json');
const winCmd = require('../../lib/win_cmd');

module.exports = function createBuild(plugin, buildTarget, buildVersion, kibanaVersion, files) {
  const buildSource = plugin.root;
  const buildRoot = join(buildTarget, 'kibana', plugin.id);

  return del(buildTarget)
    .then(function () {
      return new Promise(function (resolve, reject) {
        vfs
          .src(files, { cwd: buildSource, base: buildSource })
          // modify the package.json file
          .pipe(rewritePackageJson(buildSource, buildVersion, kibanaVersion))

          // put all files inside the correct directories
          .pipe(rename(function nestFileInDir(path) {
            const nonRelativeDirname = path.dirname.replace(/^(\.\.\/?)+/g, '');
            path.dirname = join(relative(buildTarget, buildRoot), nonRelativeDirname);
          }))

          .pipe(vfs.dest(buildTarget))
          .on('end', resolve)
          .on('error', reject);
      });
    })
    .then(function () {
      // install packages in build
      const options = {
        cwd: buildRoot,
        stdio: ['ignore', 'ignore', 'pipe'],
      };

      try {
        // use yarn if yarn lockfile is found in the build
        statSync(join(buildRoot, 'yarn.lock'));
        execFileSync(winCmd('yarn'), ['install', '--production'], options);
      } catch (e) {
        // use npm if there is no yarn lockfile in the build
        execFileSync(winCmd('npm'), ['install', '--production', '--no-bin-links'], options);
      }
    });
};
