"use strict";

var express = require('express');
var app     = module.exports = express();
var args    = process.argv;
var env     = process.env.NODE_ENV || 'development';

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/../test/fixtures'));

app.get('/env', function(req, res) {
  res.send('Howdy from ' + app.get('env') + '!');
});

// Setup simple echo for each additional argument passed for testing
args.slice(2).forEach(function(arg) {
  app.get('/' + arg, function(req, res) {
    res.send('Howdy ' + arg + ' from ' + app.get('env') + '!');
  });
});
