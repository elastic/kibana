var join = require('path').join;
var relative = require('path').relative;
var statSync = require('fs').statSync;
var execFileSync = require('child_process').execFileSync;
var del = require('del');
var vfs = require('vinyl-fs');
var rename = require('gulp-rename');

var rewritePackageJson = require('./rewrite_package_json');
var gitInfo = require('./git_info');
var winCmd = require('../../lib/win_cmd');

module.exports = function createBuild(plugin, buildTarget, buildVersion, kibanaVersion, files) {
  var buildSource = plugin.root;
  var buildRoot = join(buildTarget, 'kibana', plugin.id);

  return del(buildTarget)
    .then(function () {
      return new Promise(function (resolve, reject) {
        vfs
          .src(files, { cwd: buildSource, base: buildSource })
          // modify the package.json file
          .pipe(rewritePackageJson(buildSource, buildVersion, kibanaVersion))

          // put all files inside the correct directories
          .pipe(rename(function nestFileInDir(path) {
            var nonRelativeDirname = path.dirname.replace(/^(\.\.\/?)+/g, '');
            path.dirname = join(relative(buildTarget, buildRoot), nonRelativeDirname);
          }))

          .pipe(vfs.dest(buildTarget))
          .on('end', resolve)
          .on('error', reject);
      });
    })
    .then(function () {
      // install packages in build
      var cmd = winCmd('npm');
      var options = {
        cwd: buildRoot,
        stdio: ['ignore', 'ignore', 'pipe'],
      };

      try {
        // use yarn if yarn lockfile is found in the build
        cmd = winCmd('yarn');
        statSync(join(buildRoot, 'yarn.lock'));
        execFileSync(cmd, ['install', '--production'], options);
      } catch (e) {
        // use npm if there is no yarn lockfile in the build
        execFileSync(cmd, ['install', '--production', '--no-bin-links'], options);
      }
    });
};
