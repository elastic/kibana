var join = require('path').join;
var execFileSync = require('child_process').execFileSync;
var vfs = require('vinyl-fs');
var zip = require('gulp-zip');
var map = require('through2-map').obj;
var rename = require('gulp-rename');

module.exports = function createBuild(plugin, buildTarget, buildVersion, kibanaVersion, files) {
  var buildId = `${plugin.id}-${buildVersion}`;
  var buildSource = plugin.root;

  return new Promise(function (resolve) {
    vfs
      .src(files, { cwd: buildSource, base: buildSource })

      // modify the package.json file
      .pipe(map(function (file) {
        if (file.basename === 'package.json' && file.dirname === buildSource) {
          var pkg = JSON.parse(file.contents.toString('utf8'));

          // rewrite the target kibana version while the
          // file is on it's way to the archive
          if (!pkg.kibana) pkg.kibana = {};
          pkg.kibana.version = kibanaVersion;
          pkg.version = buildVersion;

          // append build info
          pkg.build = {
            git: gitInfo(buildSource),
            date: new Date().toString()
          };

          file.contents = toBuffer(JSON.stringify(pkg, null, 2));
        }

        return file;
      }))

      // put all files inside the correct directories
      .pipe(rename(function nestFileInDir(path) {
        var nonRelativeDirname = path.dirname.replace(/^(\.\.\/?)+/g, '');
        path.dirname = join('kibana', plugin.id, nonRelativeDirname);
      }))

      .pipe(zip(`${buildId}.zip`))
      .pipe(vfs.dest(buildTarget))
      .on('end', resolve);
  });
};

function toBuffer(string) {
  if (typeof Buffer.from === 'function') {
    return Buffer.from(string, 'utf8');
  } else {
    // this was deprecated in node v5 in favor
    // of Buffer.from(string, encoding)
    return new Buffer(string, 'utf8');
  }
}

function gitInfo(rootPath) {
  try {
    var LOG_SEPARATOR = '||';
    var commitCount = execFileSync('git', ['rev-list', '--count', 'HEAD'], {
      cwd: rootPath,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    var logLine = execFileSync('git', ['log', '--pretty=%h' + LOG_SEPARATOR + '%cD', '-n', '1'], {
      cwd: rootPath,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).split(LOG_SEPARATOR);

    return {
      count: commitCount.trim(),
      sha: logLine[0].trim(),
      date: logLine[1].trim(),
    };
  } catch (e) {
    return {};
  }
}
