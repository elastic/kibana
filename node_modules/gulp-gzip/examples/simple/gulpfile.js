var clean = require('gulp-clean');
var gulp  = require('gulp');
var gzip  = require('../../index');

gulp.task('clean', function() {
  gulp.src('tmp', { read: false })
    .pipe(clean());
});

gulp.task('compress', ['clean'], function() {
  gulp.src('../files/small.txt')
    .pipe(gzip())
    .pipe(gulp.dest('tmp'));
});

gulp.task('default', ['compress']);
