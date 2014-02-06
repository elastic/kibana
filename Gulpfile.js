var gulp = require('gulp');
var connect = require('connect');

var paths = {
  webroot: 'src/'
};

gulp.task('server', function() {
  var app = connect()
    // .use(connect.logger('dev'))
    .use(connect.static(paths.webroot));

  var server = require('http').createServer(app).listen(0, function () {
    console.log('server listeing at http://localhost:%d', server.address().port);
  });
});