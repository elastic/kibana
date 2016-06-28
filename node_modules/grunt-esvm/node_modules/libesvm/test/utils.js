var utils = require('../lib/utils');
var connect = require('connect');
var http = require('http');

describe('Utils', function() {
  describe('request', function() {

    var server;

    beforeEach(function (done) {
      var app = connect().use(function (req, res) {
        res.end(JSON.stringify({ status: 'ok' }));
      });
      server = http.createServer(app);
      server.listen(3000, done);
    });

    afterEach(function (done) {
      server.close(done);
    });

    it('should request a url', function (done) {
      utils.request('http://localhost:3000/test.json').nodeify(done);
    });

  });
});
