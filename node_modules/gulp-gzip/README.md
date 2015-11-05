gulp-gzip
=========

Gzip plugin for [gulp](https://github.com/wearefractal/gulp).

#Install

```
npm install --save-dev gulp-gzip
```

#Options

### append `Boolean`

Appends `.gz` file extension if true. Defaults to true.

```javascript
 gzip({ append: true })
```
`filename.txt` becomes `filename.txt.gz`.

### extension `String`

Appends an arbitrary extension to the filename. Disables `append` and `preExtension` options.

```javascript
 gzip({ extension: 'zip' }) // note that the `.` should not be included in the extension
```
`filename.txt` becomes `filename.txt.zip`.

### preExtension `String`

Appends an arbitrary pre-extension to the filename. Disables `append` and `extension` options.

```javascript
 gzip({ preExtension: 'gz' }) // note that the `.` should not be included in the extension
```
`filename.txt` becomes `filename.gz.txt`.

### threshold `String|Number|Boolean`

Minimum size required to compress a file. Defaults to false.

```javascript
gzip({ threshold: '1kb' })
```

```javascript
gzip({ threshold: 1024 })
```

```javascript
gzip({ threshold: true })
```

### gzipOptions `Object`

Options object to pass through to zlib.Gzip. See [zlib documentation](http://nodejs.org/api/zlib.html#zlib_options) for more information.

```javascript
gzip({ gzipOptions: { level: 9 } })
```

```javascript
gzip({ gzipOptions: { memLevel: 1 } })
```

#Examples

```javascript
var gulp = require('gulp');
var gzip = require('gulp-gzip');

gulp.task('compress', function() {
    gulp.src('./dev/scripts/*.js')
	.pipe(gzip())
	.pipe(gulp.dest('./public/scripts'));
});
```

```javascript
var gulp = require('gulp');
var coffee = require('gulp-coffee');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var gzip = require('gulp-gzip');

gulp.task('deployScripts', function() {
	gulp.src('./dev/scripts/*.coffee')
	.pipe(coffee())
	.pipe(concat('all.js'))
	.pipe(uglify())
	.pipe(gzip())
	.pipe(gulp.dest('./public/scripts'));
});
```

```javascript
var gulp = require('gulp');
var tar = require('gulp-tar');
var gzip = require('gulp-gzip');

gulp.task('tarball', function() {
	gulp.src('./files/*')
	.pipe(tar('archive.tar'))
	.pipe(gzip())
	.pipe(gulp.dest('.'));
});
```

[More examples](https://github.com/jstuckey/gulp-gzip/tree/master/examples).
