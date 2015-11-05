var clean = require('gulp-clean');
var gulp  = require('gulp');
var gzip  = require('../../index');

var config = {
  threshold: '1kb'
};

gulp.task('clean', function() {
  gulp.src('tmp', { read: false })
    .pipe(clean());
});

gulp.task('small', function() {
  gulp.src('../files/small.txt')
    .pipe(gzip(config))
    .pipe(gulp.dest('tmp'));
});

gulp.task('big', function() {
  gulp.src('../files/big.txt')
    .pipe(gzip(config))
    .pipe(gulp.dest('tmp'));
});

gulp.task('large', function() {
  gulp.src('../files/large.txt', { buffer: false })
    .pipe(gzip(config))
    .pipe(gulp.dest('tmp'));
});

gulp.task('default', ['clean', 'small', 'big', 'large']);
