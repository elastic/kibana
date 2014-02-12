/* jshint node: true */
var elasticsearch = require('../elasticsearch-js');
var async = require('async');

var es = new elasticsearch.Client({
  host: 'localhost:9200',
  sniffOnStart: true,
  sniffInterval: 3000,
  apiVersion: '1.0',
  log: 'trace'
});

var rl = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

async.series([
  function (done) {
    setTimeout(done, 50);
  },
  function (done) {
    console.log(es.transport.connectionPool._conns.index);
    es.indices.create({
      index: 'index_name'
    }, done);
  },
  function (done) {
    rl.question('Is the master down?', function () {
      done();
    });
  },
  function (done) {
    console.log(es.transport.connectionPool._conns.index);
    es.search({ index: 'index_name' }, done);
  },
  function (done) {
    rl.question('Is the slave down now?', function () {
      es.search({ body: { query: { match_all: {} } } }, done);
    });
  },
  function (done) {
    rl.question('Is the master back up?', function () {
      es.search({ body: { query: { match_all: {} } } }, done);
    });
  }
], function (err) {
  console.log(err);
});