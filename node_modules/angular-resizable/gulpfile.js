var gulp	= require('gulp');
var uglify	= require('gulp-uglify');
var minify	= require('gulp-minify-css');
var rename  = require("gulp-rename");

gulp.task('js', function() {
	return gulp.src('src/*.js')
		.pipe(uglify())
		.pipe(rename(function(path) {
			path.basename += ".min"
		}))
    	.pipe(gulp.dest(''));
});

gulp.task('css', function() {
	return gulp.src('src/*.css')
		.pipe(minify())
		.pipe(rename(function(path) {
			path.basename += ".min"
		}))
    	.pipe(gulp.dest(''));
});

gulp.task('default', ['js', 'css']);