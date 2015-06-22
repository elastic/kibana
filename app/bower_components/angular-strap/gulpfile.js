'use strict';
// bower install angular#^1.2 --save; bower install angular-animate#^1.2 angular-i18n#^1.2 angular-mocks#^1.2 angular-route#^1.2 angular-sanitize#^1.2 angular-scenario#^1.2 --save-dev
// bower install angular#^1.3 --save; bower install angular-animate#^1.3 angular-i18n#^1.3 angular-mocks#^1.3 angular-route#^1.3 angular-sanitize#^1.3 angular-scenario#^1.3 --save-dev

var gulp = require('gulp');
var path = require('path');
var util = require('util');
var gutil = require('gulp-util');
var merge = require('merge-stream');
var changed = require('gulp-changed');
var rename = require('gulp-rename');
var pkg = require('./package.json');
var chalk = require('chalk');
var fs = require('fs');

// CONFIG
//

var src = {
  cwd: 'src',
  dist: 'dist',
  scripts: '*/*.js',
  index: 'module.js',
  templates: '*/*.tpl.html',
};

var docs = {
  cwd: 'docs',
  tmp: '.tmp',
  dist: 'pages',
  index: 'index.html',
  views: 'views/**/*.html',
  scripts: 'scripts/**/*.js',
  images: 'images/{,*/}*.{jpg,png,svg}',
  styles: 'styles/*.less',
  watch: {
    styles: 'styles/**/*.less'
  }
};

var ports = {
  docs: 9090,
  pages: 9090
};

var banner = gutil.template('/**\n' +
  ' * <%= pkg.name %>\n' +
  ' * @version v<%= pkg.version %> - <%= today %>\n' +
  ' * @link <%= pkg.homepage %>\n' +
  ' * @author <%= pkg.author.name %> (<%= pkg.author.email %>)\n' +
  ' * @license MIT License, http://www.opensource.org/licenses/MIT\n' +
  ' */\n', {file: '', pkg: pkg, today: new Date().toISOString().substr(0, 10)});


// CLEAN
//
var clean = require('gulp-clean');
gulp.task('clean:tmp', function() {
  return gulp.src(['.tmp/*'], {read: false})
    .pipe(clean());
});
gulp.task('clean:test', function() {
  return gulp.src(['test/.tmp/*', 'test/coverage/*'], {read: false})
    .pipe(clean());
});
gulp.task('clean:dist', function() {
  return gulp.src([src.dist + '/*'], {read: false})
    .pipe(clean());
});
gulp.task('clean:pages', function() {
  return gulp.src([docs.dist + '/*', '!' + docs.dist + '/1.0', '!' + docs.dist + '/static', '!' + docs.dist + '/dist', '!' + docs.dist + '/.git'], {read: false})
    .pipe(clean());
});


// CONNECT
//
var connect = require('gulp-connect');
gulp.task('connect:docs', function() {
  connect.server({
    root: ['.tmp', '.dev', docs.cwd, src.cwd],
    port: ports.docs,
    livereload: true
  });
});
gulp.task('connect:pages', function() {
  connect.server({
    root: [docs.dist],
    port: ports.pages,
  });
});
var chrome = require('gulp-open');
gulp.task('open:docs', function(){
  gulp.src(docs.index, {cwd: docs.cwd})
  .pipe(chrome('', {url: 'http://localhost:' + ports.docs}));
});
gulp.task('open:pages', function(){
  gulp.src(docs.index, {cwd: docs.dist})
  .pipe(chrome('', {url: 'http://localhost:' + ports.pages}));
});


// WATCH
//

var watch = require('gulp-watch');
gulp.task('watch:docs', function() {
  watch(docs.scripts, {cwd: docs.cwd}, function(files) {
    return files.pipe(connect.reload());
  });
  watch(docs.watch.styles, {cwd: docs.cwd}, function(files) {
    return gulp.start('styles:docs');
  });
  watch([docs.index, docs.views], {cwd: docs.cwd}, function(files) {
    return files.pipe(connect.reload());
  });
});
gulp.task('watch:dev', function() {
  watch(src.scripts, {cwd: src.cwd}, function(files) {
    return files.pipe(connect.reload());
  });
});


// SCRIPTS
//
var uglify = require('gulp-uglify');
var ngAnnotate = require('gulp-ng-annotate');
var ngmin = require('gulp-ngmin');
var concat = require('gulp-concat-util');
var sourcemaps = require('gulp-sourcemaps');
gulp.task('scripts:dist', function(foo) {

  var merged = merge(

    // Build unified package
    gulp.src([src.index, src.scripts], {cwd: src.cwd})
      .pipe(sourcemaps.init())
      .pipe(ngAnnotate())
      .pipe(concat(pkg.name + '.js', {process: function(src) { return '// Source: ' + path.basename(this.path) + '\n' + (src.trim() + '\n').replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1'); }}))
      .pipe(concat.header('(function(window, document, undefined) {\n\'use strict\';\n'))
      .pipe(concat.footer('\n})(window, document);\n'))
      .pipe(concat.header(banner))
      .pipe(gulp.dest(src.dist))
      .pipe(rename(function(path) { path.extname = '.min.js'; }))
      .pipe(uglify())
      .pipe(concat.header(banner))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(src.dist)),

    // Build individual modules
    gulp.src(src.scripts, {cwd: src.cwd})
      .pipe(sourcemaps.init())
      .pipe(ngAnnotate())
      .pipe(rename(function(path){ path.dirname = ''; })) // flatten
      .pipe(concat.header(banner))
      .pipe(gulp.dest(path.join(src.dist, 'modules')))
      .pipe(rename(function(path) { path.extname = '.min.js'; }))
      .pipe(uglify())
      .pipe(concat.header(banner))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(path.join(src.dist, 'modules')))

  );

  merged.on('error', function(err) {
    gutil.log(chalk.red(util.format('Plugin error: %s', err.message)));
  });

  return merged;

});
gulp.task('scripts:pages', function(foo) {

  var merged = merge(

    // Build unified package
    gulp.src([src.index, src.scripts], {cwd: src.cwd})
      .pipe(sourcemaps.init())
      .pipe(ngmin())
      .pipe(concat(pkg.name + '.js', {process: function(src) { return '// Source: ' + path.basename(this.path) + '\n' + (src.trim() + '\n').replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1'); }}))
      .pipe(concat.header('(function(window, document, undefined) {\n\'use strict\';\n'))
      .pipe(concat.footer('\n})(window, document);\n'))
      .pipe(concat.header(banner))
      .pipe(gulp.dest(path.join(docs.dist, 'scripts')))
      .pipe(rename(function(path) { path.extname = '.min.js'; }))
      .pipe(uglify())
      .pipe(concat.header(banner))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(path.join(docs.dist, 'scripts')))

  );

  merged.on('error', function(err) {
    gutil.log(chalk.red(util.format('Plugin error: %s', err.message)));
  });

  return merged;

});

// TEMPLATES
//
var ngtemplate = require('gulp-ngtemplate');
var uglify = require('gulp-uglify');
var ngmin = require('gulp-ngmin');
var createModuleName = function(src) { return 'mgcrea.ngStrap.' + src.split(path.sep)[0]; };
gulp.task('templates:dist', function() {

  var merged = merge(

    // Build unified package
    gulp.src(src.templates, {cwd: src.cwd})
      .pipe(htmlmin({removeComments: true, collapseWhitespace: true}))
      .pipe(ngtemplate({module: createModuleName}))
      .pipe(ngAnnotate())
      .pipe(concat(pkg.name + '.tpl.js', {process: function(src) { return '// Source: ' + path.basename(this.path) + '\n' + (src.trim() + '\n').replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1'); }}))
      .pipe(concat.header('(function(window, document, undefined) {\n\'use strict\';\n\n'))
      .pipe(concat.footer('\n\n})(window, document);\n'))
      .pipe(concat.header(banner))
      .pipe(gulp.dest(src.dist))
      .pipe(rename(function(path) { path.extname = '.min.js'; }))
      .pipe(uglify())
      .pipe(concat.header(banner))
      .pipe(gulp.dest(src.dist)),

    // Build individual modules
    gulp.src(src.templates, {cwd: src.cwd})
      .pipe(htmlmin({removeComments: true, collapseWhitespace: true}))
      .pipe(ngtemplate({module: createModuleName}))
      .pipe(ngAnnotate())
      .pipe(rename(function(path){ path.dirname = ''; })) // flatten
      .pipe(concat.header(banner))
      .pipe(gulp.dest(path.join(src.dist, 'modules')))
      .pipe(rename(function(path) { path.extname = '.min.js'; }))
      .pipe(uglify())
      .pipe(concat.header(banner))
      .pipe(gulp.dest(path.join(src.dist, 'modules')))

  );

  merged.on('error', function(err) {
    gutil.log(chalk.red(util.format('Plugin error: %s', err.message)));
  });

  return merged;

});
gulp.task('templates:pages', function() {

  var merged = merge(

    // Build docs partials
    gulp.src(['views/sidebar.html', 'views/partials/*.html'], {cwd: docs.cwd, base: docs.cwd})
      .pipe(htmlmin({removeComments: true, collapseWhitespace: true}))
      .pipe(ngtemplate({module: 'mgcrea.ngStrapDocs'}))
      .pipe(ngAnnotate())
      .pipe(concat('docs.tpl.js', {process: function(src) { return '// Source: ' + path.basename(this.path) + '\n' + (src.trim() + '\n').replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1'); }}))
      .pipe(concat.header('(function(window, document, undefined) {\n\'use strict\';\n\n'))
      .pipe(concat.footer('\n\n})(window, document);\n'))
      .pipe(gulp.dest(path.join(docs.dist, 'scripts')))
      .pipe(rename(function(path) { path.extname = '.min.js'; }))
      .pipe(uglify())
      .pipe(concat.header(banner))
      .pipe(gulp.dest(path.join(docs.dist, 'scripts'))),

    // Build demo partials
    gulp.src('*/docs/*.tpl.demo.html', {cwd: src.cwd})
      .pipe(htmlmin({removeComments: true, collapseWhitespace: true}))
      .pipe(ngtemplate({module: 'mgcrea.ngStrapDocs'}))
      .pipe(ngAnnotate())
      .pipe(concat('demo.tpl.js', {process: function(src) { return '// Source: ' + path.basename(this.path) + '\n' + (src.trim() + '\n').replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1'); }}))
      .pipe(concat.header('(function(window, document, undefined) {\n\'use strict\';\n\n'))
      .pipe(concat.footer('\n\n})(window, document);\n'))
      .pipe(concat.header(banner))
      .pipe(gulp.dest(path.join(docs.dist, 'scripts')))
      .pipe(rename(function(path) { path.extname = '.min.js'; }))
      .pipe(uglify())
      .pipe(concat.header(banner))
      .pipe(gulp.dest(path.join(docs.dist, 'scripts'))),

    // Build unified package
    gulp.src(src.templates, {cwd: src.cwd})
      .pipe(htmlmin({removeComments: true, collapseWhitespace: true}))
      .pipe(ngtemplate({module: createModuleName}))
      .pipe(ngAnnotate())
      .pipe(concat(pkg.name + '.tpl.js', {process: function(src) { return '// Source: ' + path.basename(this.path) + '\n' + (src.trim() + '\n').replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1'); }}))
      .pipe(concat.header('(function(window, document, undefined) {\n\'use strict\';\n\n'))
      .pipe(concat.footer('\n\n})(window, document);\n'))
      .pipe(concat.header(banner))
      .pipe(gulp.dest(path.join(docs.dist, 'scripts')))
      .pipe(rename(function(path) { path.extname = '.min.js'; }))
      .pipe(uglify())
      .pipe(concat.header(banner))
      .pipe(gulp.dest(path.join(docs.dist, 'scripts')))

  );

  merged.on('error', function(err) {
    gutil.log(chalk.red(util.format('Plugin error: %s', err.message)));
  });

  return merged;

});
gulp.task('templates:test', function() {

  // Build individual modules
  return gulp.src(src.templates, {cwd: src.cwd})
    .pipe(htmlmin({removeComments: true, collapseWhitespace: true}))
    .pipe(ngtemplate({module: createModuleName}))
    .pipe(ngmin())
    .pipe(rename(function(path){ path.dirname = ''; })) // flatten
    .pipe(concat.header(banner))
    .pipe(gulp.dest('test/.tmp/templates'));

});


// STYLES
//
var prefix = require('gulp-autoprefixer');
var less = require('gulp-less');
var safeLess = merge(less());
safeLess.on('error', function(err) {
  gutil.log(chalk.red(util.format('Plugin error: %s', err.message)));
});
gulp.task('styles:docs', function() {
  return gulp.src(docs.styles, {cwd: docs.cwd, base: docs.cwd})
    .pipe(changed('.tmp/styles'))
    .pipe(less())
    .pipe(prefix('last 1 version'))
    .pipe(gulp.dest(docs.tmp))
    .pipe(connect.reload());
});
gulp.task('styles:pages', function() {
  return gulp.src(docs.styles, {cwd: docs.cwd, base: docs.cwd})
    .pipe(safeLess)
    .pipe(prefix('last 1 version', '> 1%', 'ie 8'))
    .pipe(concat.header(banner))
    .pipe(gulp.dest(docs.dist));
});


// VIEWS
//
var htmlmin = require('gulp-htmlmin');
var usemin = require('gulp-usemin');
var nginclude = require('gulp-nginclude');
var cleancss = require('gulp-cleancss');
gulp.task('views:pages', function() {

  var merged = merge(

    // Build views
    // gulp.src(docs.views, {cwd: docs.cwd})
    //   .pipe(htmlmin({collapseWhitespace: true}))
    //   .pipe(gulp.dest(docs.dist)),

    // Build index
    gulp.src(docs.index, {cwd: docs.cwd})
      .pipe(nginclude({assetsDirs: [src.cwd]}))
      .pipe(usemin({
        js: [ngmin(), uglify(), concat.header(banner)],
        lib: ['concat'], // supeseeded by scripts:pages & templates:pages
        css: [cleancss(), concat.header(banner)]
      }))
      .pipe(gulp.dest(docs.dist))

  );

  merged.on('error', function(err) {
    gutil.log(chalk.red(util.format('Plugin error: %s', err.message)));
  });

  return merged;
});


// TEST
//
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var testTimezone = '';
gulp.task('jshint', function() {
  gulp.src(src.scripts, {cwd: src.cwd})
    .pipe(changed(src.scripts))
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});
var karma = require('karma').server;
gulp.task('karma:unit', ['templates:test'], function() {
  // if testTimezone has value, set the environment timezone
  // before starting karma, so PhantomJS picks up the
  // timezone setting
  if (testTimezone) {
    console.log('Setting timezone to => [' + testTimezone + ']');
    process.env.TZ = testTimezone;
  }
  karma.start({
    configFile: path.join(__dirname, 'test/karma.conf.js'),
    browsers: ['PhantomJS'],
    reporters: ['dots'],
    singleRun: true
  }, function(code) {
    gutil.log('Karma has exited with ' + code);
    process.exit(code);
  });
});
gulp.task('karma:server', ['templates:test'], function() {
  karma.start({
    configFile: path.join(__dirname, 'test/karma.conf.js'),
    browsers: ['PhantomJS'],
    reporters: ['progress'],
    autoWatch: true,
    singleRun: false
  }, function(code) {
    gutil.log('Karma has exited with ' + code);
    process.exit(code);
  });
});
// codeclimate-test-reporter
gulp.task('karma:travis', ['templates:test'], function() {
  karma.start({
    configFile: path.join(__dirname, 'test/karma.conf.js'),
    browsers: ['PhantomJS'],
    reporters: ['dots', 'coverage'],
    singleRun: true
  }, function(code) {
    gutil.log('Karma has exited with ' + code);
    process.exit(code);
    // gulp.src('test/coverage/**/lcov.info')
    //   .pipe(coveralls())
    //   .on('end', function() {
    //     process.exit(code);
    //   });
  });
});
gulp.task('karma:travis~1.2.0', ['templates:test'], function() {
  karma.start({
    configFile: path.join(__dirname, 'test/~1.2.0/karma.conf.js'),
    browsers: ['PhantomJS'],
    reporters: ['dots'],
    singleRun: true
  }, function(code) {
    gutil.log('Karma has exited with ' + code);
    process.exit(code);
  });
});

// COPY
//
gulp.task('copy:pages', function() {
  gulp.src(['favicon.ico', docs.images], {cwd: docs.cwd, base: docs.cwd})
    .pipe(gulp.dest(docs.dist));
  gulp.src('**/*.js', {cwd: src.dist, base: src.dist})
    .pipe(gulp.dest(path.join(docs.dist, src.dist)));
});


// DEFAULT
//
var runSequence = require('run-sequence');
gulp.task('default', ['dist']);
gulp.task('build', ['dist']);
gulp.task('test', function() {
  runSequence('clean:test', 'templates:test', ['jshint', 'karma:unit']);
});
gulp.task('test:timezone', function() {
  // parse command line argument for optional timezone
  // invoke like this:
  //     gulp test:timezone --Europe/Paris
  var timezone = process.argv[3] || '';
  testTimezone = timezone.replace(/-/g, '');
  runSequence('clean:test', 'templates:test', ['jshint', 'karma:unit']);
});
gulp.task('test:server', function() {
  runSequence('clean:test', 'templates:test', 'karma:server');
});
gulp.task('dist', function() {
  runSequence('clean:dist', ['templates:dist', 'scripts:dist']);
});
gulp.task('pages', function() {
  runSequence('clean:pages', 'styles:docs', 'views:pages', ['templates:pages', 'scripts:pages', 'copy:pages']);
});
gulp.task('serve', function() {
  runSequence('clean:tmp', ['styles:docs', 'connect:docs'], ['open:docs', 'watch:docs', 'watch:dev']);
});
gulp.task('serve:pages', ['connect:pages', 'open:pages']);
