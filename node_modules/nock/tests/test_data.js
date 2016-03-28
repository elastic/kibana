var nock = require('../');
var assert = require('assert');
var http = require('http');

var tap = require('tap')

tap.test('data emits', function(t) {
  var reqBody = {data:{message:"hello"}};

  nock("http://api.songkick.com")
    .get('/api/3.0/search/venues.json?query=brudenell&apikey=XXXkeyXXX')
    .reply(200, reqBody);

  var req = http.get('http://api.songkick.com/api/3.0/search/venues.json?query=brudenell&apikey=XXXkeyXXX', function(res) {
    var body = '';

    res.on('data', function(d) {
      body += d;
    });

    res.on('end', function() {
      assert.deepEqual(JSON.parse(body), reqBody);
      t.end();
    });

  });

});