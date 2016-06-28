var gulp = require('gulp');
var rename = require('gulp-rename');
var less = require('gulp-less');
var minifyCss = require('gulp-minify-css');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var karma = require('karma').server;

gulp.task('default', ['css', 'jshint', 'test', 'compress']);

gulp.task('less', function() {
  return gulp.src('./less/*.less')
    .pipe(less())
    .pipe(gulp.dest('./css'));
});

gulp.task('css', ['less'], function() {
  return gulp.src('./css/colorpicker.css')
      .pipe(minifyCss())
      .pipe(rename('colorpicker.min.css'))
      .pipe(gulp.dest('./css'));
});

gulp.task('jshint', function () {
  return gulp.src(['js/*.js', 'test/unit/*.js', '!js/bootstrap-colorpicker-module.min.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
});

gulp.task('compress', function() {
  gulp.src('./js/bootstrap-colorpicker-module.js')
      .pipe(uglify())
      .pipe(rename('bootstrap-colorpicker-module.min.js'))
      .pipe(gulp.dest('./js'))
});

gulp.task('test', function (done) {
  karma.start({
    configFile: __dirname + '/test/karma.conf.js',
    singleRun: true
  }, done);
});