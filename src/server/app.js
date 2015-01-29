var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var requestLogger = require('./lib/requestLogger');
var auth = require('./lib/auth');
var appHeaders = require('./lib/appHeaders');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compression = require('compression');
var config = require('./config');

var routes = require('./routes/index');
var proxy = require('./routes/proxy');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('x-powered-by', false);

app.use(requestLogger());
app.use(auth());
app.use(appHeaders());
app.use(favicon(path.join(config.public_folder, 'styles', 'theme', 'elk.ico')));

if (app.get('env') === 'development') {
  require('./dev')(app);
}

// The proxy must be set up before all the other middleware.
// TODO: WE might want to move the middleware to each of the individual routes
// so we don't have weird conflicts in the future.
app.use('/elasticsearch', proxy);
app.use('/enforcer', require('./lib/enforce'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression());
app.use(express.static(config.public_folder));
if (config.external_plugins_folder) app.use('/plugins', express.static(config.external_plugins_folder));

app.use('/', routes);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
