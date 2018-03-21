const join = require('path').join;
const relative = require('path').relative;
const unlinkSync = require('fs').unlinkSync;
const execFileSync = require('child_process').execFileSync;
const del = require('del');
const vfs = require('vinyl-fs');
const rename = require('gulp-rename');
const through = require('through2');
const minimatch = require('minimatch');

const rewritePackageJson = require('./rewrite_package_json');
const winCmd = require('../../lib/win_cmd');

// `link:` dependencies create symlinks, but we don't want to include symlinks
// in the built zip file. Therefore we remove all symlinked dependencies, so we
// can re-create them when installing the plugin.
function removeSymlinkDependencies(root) {
  const nodeModulesPattern = join(root, '**', 'node_modules', '**');

  return through.obj((file, enc, cb) => {
    const isSymlink = file.symlink != null;
    const isDependency = minimatch(file.path, nodeModulesPattern);

    if (isSymlink && isDependency) {
      unlinkSync(file.path);
    }

    cb();
  });
}

module.exports = function createBuild(plugin, buildTarget, buildVersion, kibanaVersion, files) {
  const buildSource = plugin.root;
  const buildRoot = join(buildTarget, 'kibana', plugin.id);

  return del(buildTarget)
    .then(function () {
      return new Promise(function (resolve, reject) {
        vfs
          .src(files, { cwd: buildSource, base: buildSource, allowEmpty: true })
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
      if (plugin.skipInstallDependencies) {
        return;
      }

      // install packages in build
      const options = {
        cwd: buildRoot,
        stdio: ['ignore', 'ignore', 'pipe'],
      };

      execFileSync(winCmd('yarn'), ['install', '--production', '--pure-lockfile'], options);
    })
    .then(function () {
      const buildFiles = [relative(buildTarget, buildRoot) + '/**/*'];

      return new Promise((resolve, reject) => {
        vfs.src(buildFiles, { cwd: buildTarget, base: buildTarget, resolveSymlinks: false })
          .pipe(removeSymlinkDependencies(buildRoot))
          .on('finish', resolve)
          .on('error', reject);
      });
    });
};
