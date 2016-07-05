
var gulp = require('gulp');
var _ = require('lodash');
var glob = require('glob');
var yargs = require('yargs').argv;
var aws = require('aws-sdk');
var path = require('path');
var gulpUtil = require('gulp-util');
var mkdirp = require('mkdirp');
var Rsync = require('rsync');
var Promise = require('bluebird');
var eslint = require('gulp-eslint');
var rimraf = require('rimraf');
var zip = require('gulp-zip');
var fs = require('fs');
var child = require('child_process');
var semver = require('semver');
var mocha = require('gulp-mocha');

var pkg = require('./package.json');
var packageName = pkg.name  + '-' + pkg.version;

var buildDir = path.resolve(__dirname, 'build/kibana');
var packageRoot = path.resolve(__dirname, 'build');

var targetDir = path.resolve(__dirname, 'target');
var buildTarget = path.resolve(buildDir, pkg.name);
var kibanaPluginDir = path.resolve(__dirname, '../kibana/plugins/' + pkg.name);

var build = [
  'package.json',
  'index.js',
  'node_modules',
  'public',
  'bower_components',
  'vendor_components',
  'init.js',
  'server',
  'timelion.json'
];

var develop = build.concat([
  'timelion.private.json'
]);

var exclude = Object.keys(pkg.devDependencies).map(function (name) {
  return path.join('node_modules', name);
});

function writeDocs(done) {
  require('babel-core/register');
  var fs = require('fs');
  var helpish = require('./server/lib/functions_md');

  fs.writeFile(path.resolve(__dirname, 'FUNCTIONS.md'), helpish, function (err) {
    if (err) {
      return done(err);
    } else {
      done();
    }
  });
}

function syncPluginTo(include, dest, done) {
  mkdirp(dest, function (err) {
    if (err) return done(err);
    Promise.all(include.map(function (name) {
      var source = path.resolve(__dirname, name);
      try {fs.accessSync(source);} catch (e) {return;};
      return new Promise(function (resolve, reject) {
        var rsync = new Rsync();
        rsync
          .source(source)
          .destination(dest)
          .flags('uav')
          .recursive(true)
          .set('delete')
          .exclude(exclude)
          .output(function (data) {
            process.stdout.write(data.toString('utf8'));
          });
        rsync.execute(function (err) {
          if (err) {
            console.log(err);
            return reject(err);
          }
          resolve();
        });
      });
    }))
    .then(function () {
      done();
    })
    .catch(done);
  });
}

gulp.task('sync', function (done) {
  syncPluginTo(develop, kibanaPluginDir, done);
});

gulp.task('docs', function (done) {
  writeDocs(done);
});

gulp.task('version', function (done) {
  var newVersion = '0.1.' + (semver.patch(pkg.version) + 1);
  child.exec('npm version --no-git-tag-version ' + newVersion, function () {
    console.log('Timelion version is ' + newVersion);
    done();
  });
});


gulp.task('lint', function (done) {
  return gulp.src(['server/**/*.js', 'public/**/*.js'])
    // eslint() attaches the lint output to the eslint property
    // of the file object so it can be used by other modules.
    .pipe(eslint())
    // eslint.format() outputs the lint results to the console.
    // Alternatively use eslint.formatEach() (see Docs).
    .pipe(eslint.formatEach())
    // To have the process exit with an error code (1) on
    // lint error, return the stream and pipe to failOnError last.
    .pipe(eslint.failOnError());
});

gulp.task('clean', function (done) {
  Promise.each([packageRoot, targetDir], function (dir) {
    return new Promise(function (resolve, reject) {
      rimraf(dir, function (err) {
        if (err) return reject(err);
        resolve();
      });
    });
  }).nodeify(done);
});

gulp.task('build', ['clean'], function (done) {
  syncPluginTo(build, buildTarget, done);
});

gulp.task('package', ['build'], function (done) {
  function writePackages(versions, done) {
    if (!versions.length) { done(); return; }

    // Write a new version so it works with the Kibana package manager
    var editable = _.cloneDeep(pkg);
    editable.version = versions.shift();
    require('fs').writeFileSync(buildTarget + '/' + 'package.json', JSON.stringify(editable, null, '  '));

    var archiveName = editable.name  + '-' + editable.version + '.zip';

    gulp.src(path.join(packageRoot, '**', '*'))
      .pipe(zip(archiveName))
      .pipe(gulp.dest(targetDir))
      .on('end', function () {
        gulpUtil.log('Packaged', archiveName);
        writePackages(versions, done);
      });
  }

  // Write one archive for every supported kibana version, plus one with the actual timelion version

  writePackages(pkg.kibanas.concat([pkg.version]), done);
});

gulp.task('release', ['package'], function (done) {
  function upload(files, done) {
    if (!files.length) { done(); return; }

    var filename = _.last(files.shift().split('/'));
    var s3 = new aws.S3();
    var params = {
      Bucket: 'download.elasticsearch.org',
      Key: 'kibana/timelion/' + filename,
      Body: fs.createReadStream(path.join(targetDir, filename))
    };
    s3.upload(params, function (err, data) {
      if (err) return done(err);
      gulpUtil.log('Finished', gulpUtil.colors.cyan('uploaded') + ' Available at ' + data.Location);
      upload(files, done);
    });
  }

  glob(targetDir + '/*.zip', function (err, files) {
    upload(files, done);
  });
});

gulp.task('dev', ['sync'], function (done) {
  gulp.watch([
    'index.js',
    'node_modules',
    'public/**/*',
    'bower_components',
    'vendor_components',
    'init.js',
    'server/**/*',
    'timelion.json'
  ], ['sync', 'lint', 'test']);
});

gulp.task('test', [], function () {
  require('babel-core/register');
  return gulp.src([
    'server/**/__test__/**/*.js'
  ], { read: false })
  .pipe(mocha({ reporter: 'list' }));
});
