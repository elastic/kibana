
var nock    = require('../.')
  , nockBack= nock.back
  , tap     = require('tap')
  , http    = require('http')
  , fs      = require('fs')
  , exists  = fs.existsSync;

nock.enableNetConnect();

var originalMode = nockBack.currentMode;

function testNock (t) {
  var dataCalled = false;

  var scope = nock('http://www.google.com')
    .get('/')
    .reply(200, "Hello World!");

  var req = http.request({
      host: "www.google.com"
    , path: '/'
    , port: 80
    }, function(res) {

      t.equal(res.statusCode, 200);
      res.on('end', function() {
          t.ok(dataCalled);
          scope.done();
          t.end();
        });
      res.on('data', function(data) {
          dataCalled = true;
          t.ok(data instanceof Buffer, "data should be buffer");
          t.equal(data.toString(), "Hello World!", "response should match");
        });
    });

  req.end();
}




function nockBackWithFixture (t, scopesLoaded) {
  var scopesLength = scopesLoaded ? 1 : 0;

  nockBack('goodRequest.json', function (done) {
    t.true(this.scopes.length === scopesLength);
    http.get('http://www.google.com').end();
    this.assertScopesFinished();
    done();
    t.end();
  });
}




tap.test('nockBack throws an exception when fixtures is not set', function (t) {

  try {
    nockBack();
  } catch (e) {
    t.ok(true, 'excpected exception');
    t.end();
    return;
  }

  t.fail(true, false, 'test should have ended');

});




tap.test('nockBack wild tests', function (nw) {

  //  Manually disable net connectivity to confirm that dryrun enables it.
  nock.disableNetConnect();

  nockBack.fixtures = __dirname + '/fixtures';
  nockBack.setMode('wild');

  nw.test('normal nocks work', function (t) {
    testNock(t);
  });


  nw.test('nock back doesn\'t do anything', function (t) {
    nockBackWithFixture(t, false);
  });

})
.on('end', function () {

  nockBack.setMode(originalMode);

});




tap.test('nockBack dryrun tests', function (nw) {

  //  Manually disable net connectivity to confirm that dryrun enables it.
  nock.disableNetConnect();

  nockBack.fixtures = __dirname + '/fixtures';
  nockBack.setMode('dryrun');

  nw.test('goes to internet even when no nockBacks are running', function(t) {
    var req = http.request({
        host: "www.amazon.com"
      , path: '/'
      , port: 80
      }, function(res) {

        t.ok([200, 302].indexOf(res.statusCode) >= 0);
        t.end();

      });

    req.on('error', function(err) {

      //  This should never happen.
      t.assert(false);
      t.end();

    });

    req.end();
  });

  nw.test('normal nocks work', function (t) {
    testNock(t);
  });

  nw.test('uses recorded fixtures', function (t) {
    nockBackWithFixture(t, true);
  });

  nw.test('goes it internet, doesn\'t recorded new fixtures', function (t) {

    var dataCalled = false;

    var fixture = 'someDryrunFixture.json';
    var fixtureLoc = nockBack.fixtures + '/' + fixture;

    t.false(exists(fixtureLoc));

    nockBack(fixture, function (done) {
      var req = http.request({
          host: "www.amazon.com"
        , path: '/'
        , port: 80
        }, function(res) {

          t.ok([200, 302].indexOf(res.statusCode) >= 0);
          res.on('end', function() {
            var doneFails = false;

            t.ok(dataCalled);
            try {
              done();
              t.false(exists(fixtureLoc));
              scope.done();
            } catch(err) {
              doneFails = true;
            }
            t.ok(doneFails);
            t.end();
          });

          res.on('data', function(data) {
            dataCalled = true;
          });

        });

      req.on('error', function(err) {
        if (err.code !== 'ECONNREFUSED') {
          throw err;
        }
        t.end();
      });

      req.end();
    });
  });
})
.on('end', function () {

  nockBack.setMode(originalMode);

});




tap.test('nockBack record tests', function (nw) {
  nockBack.setMode('record');

  nw.test('it records when configured correctly', function (t) {
    nockBack.fixtures = __dirname + '/fixtures';

    var options = {
      host: 'www.google.com', method: 'GET', path: '/', port: 80
    };

    var fixture = 'someFixture.json';
    var fixtureLoc = nockBack.fixtures + '/' + fixture;

    t.false(exists(fixtureLoc));

    nockBack(fixture, function (done) {
      http.request(options).end();
      done();

      t.true(exists(fixtureLoc));

      fs.unlinkSync(fixtureLoc);
      t.end();
    });

  });

  //Adding this test because there was an issue when not calling
  //nock.activate() after calling nock.restore()
  nw.test('it can record twice', function (t) {
    nockBack.fixtures = __dirname + '/fixtures';

    var options = {
      host: 'www.google.com', method: 'GET', path: '/', port: 80
    };
    var fixture = 'someFixture2.json';
    var fixtureLoc = nockBack.fixtures + '/' + fixture;
    t.false(exists(fixtureLoc));

    nockBack(fixture, function (done) {
      http.request(options).end();
      done();

      t.true(exists(fixtureLoc));

      fs.unlinkSync(fixtureLoc);
      t.end();
    });

  });


  nw.test('it shouldn\'t allow outside calls', function (t) {

    var fixture = 'wrongUri.json';

    nockBack(fixture, function (done) {

      http.get('http://www.amazon.com', function(res) {
        throw "should not request this";
      }).on('error', function(err) {
        t.equal(err.message, 'Nock: Not allow net connect for "www.amazon.com:80/"');
        done();
        t.end();
      });

    });

  });


  nw.test('it loads your recorded tests', function (t) {

    nockBack('goodRequest.json', function (done) {
      t.true(this.scopes.length > 0);
      http.get('http://www.google.com').end();
      this.assertScopesFinished();
      done();
      t.end();
    });

  });

  nw.end();
})
.on('end', function () {

  nockBack.setMode(originalMode);

});




tap.test('nockBack lockdown tests', function (nw) {
  nockBack.fixtures = __dirname + '/fixtures';
  nockBack.setMode('lockdown');

  nw.test('normal nocks work', function (t) {
    testNock(t);
  });


  nw.test('nock back loads scope', function (t) {
    nockBackWithFixture(t, true);
  });

  nw.test('no unnocked http calls work', function (t) {
    var req = http.request({
        host: "google.com"
      , path: '/'
      }, function(res) {
        throw new Error('should not come here!');
      });


    req.on('error', function (err) {
      t.equal(err.message.trim(), 'Nock: Not allow net connect for "google.com:80/"');
      t.end();
    });


    req.end();
  });
})
.on('end', function () {

  nockBack.setMode(originalMode);

});
