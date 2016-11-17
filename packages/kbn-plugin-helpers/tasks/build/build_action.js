module.exports = function (plugin) {
  return new Promise(function (resolve, reject) {
    var vfs = require('vinyl-fs');
    var zip = require('gulp-zip');
    var map = require('through2-map').obj;
    var rename = require('gulp-rename');
    var join = require('path').join;
    var inquirer = require('inquirer');

    function main() {
      var kibanaVersion = (plugin.pkg.kibana && plugin.pkg.kibana.version) || plugin.pkg.version;
      var deps = Object.keys(plugin.pkg.dependencies || {});
      var buildId = `${plugin.id}-${plugin.version}`;

      if (kibanaVersion === 'kibana') {
        askForKibanaVersion(function (customKibanaVersion) {
          build(buildId, deps, customKibanaVersion);
        });
      } else {
        build(buildId, deps, kibanaVersion);
      }
    }

    function askForKibanaVersion(cb) {
      inquirer.prompt([
        {
          type: 'input',
          name: 'kibanaVersion',
          message: 'What version of Kibana are you building for?'
        }
      ]).then(function (answers) {
        cb(answers.kibanaVersion);
      });
    }

    function toBuffer(string) {
      if (typeof Buffer.from === 'function') {
        return Buffer.from(string, 'utf8');
      } else {
        // this was deprecated in node v5 in favor
        // of Buffer.from(string, encoding)
        return new Buffer(string, 'utf8');
      }
    }

    function build(buildId, deps, kibanaVersion) {
      var files = [
        'package.json',
        'index.js',
        '{lib,public,server,webpackShims}/**/*'
      ];

      if (deps.length === 1) {
        files.push(`node_modules/${ deps[0] }/**/*`);
      } else if (deps.length) {
        files.push(`node_modules/{${ deps.join(',') }}/**/*`);
      }

      vfs
        .src(files, { cwd: plugin.root, base: plugin.root })

        // rewrite the target kibana version while the
        // file is on it's way to the archive
        .pipe(map(function (file) {
          if (file.basename === 'package.json') {
            const pkg = JSON.parse(file.contents.toString('utf8'));
            if (!pkg.kibana) pkg.kibana = {};
            pkg.kibana.version = kibanaVersion;
            file.contents = toBuffer(JSON.stringify(pkg));
          }

          return file;
        }))

        // put all files inside the correct directoried
        .pipe(rename(function nestFileInDir(path) {
          path.dirname = join('kibana', plugin.id, path.dirname);
        }))

        .pipe(zip(`${buildId}.zip`))
        .pipe(vfs.dest(join(plugin.root, 'build')))
        .on('end', resolve);
    }

    main();
  });
};
