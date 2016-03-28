'use strict';

var fs      = require('fs');
var nock    = require('../.');
var http    = require('http');
var https   = require('https');
var util    = require('util');
var events  = require('events');
var stream  = require('stream');
var test    = require('tap').test;
var mikealRequest = require('request');
var superagent = require('superagent');
var needle  = require("needle");
var restify = require('restify');
var domain  = require('domain');
var hyperquest = require('hyperquest');

var globalCount;

nock.enableNetConnect();

test("setup", function(t) {
  globalCount = Object.keys(global).length;
  t.end();
});

test("double activation throws exception", function(t) {
  nock.restore();
  t.false(nock.isActive());
  try {
    nock.activate();
    t.true(nock.isActive());
    nock.activate();
    //  This line should never be reached.
    t.false(true);
  } catch(e) {
    t.equal(e.toString(), 'Error: Nock already active');
  }
  t.true(nock.isActive());
  t.end();
});

test("allow override works (2)", function(t) {
  var scope =
  nock("https://httpbin.org",{allowUnmocked: true}).
    post("/post").
    reply(200,"99problems");

  var options = {
    method: "POST",
    uri: "https://httpbin.org/post",
    json: {
      some: "data"
    }
  };

  mikealRequest(options, function(err, resp, body) {
    scope.done();
    t.end();
    return console.log(resp.statusCode, body);
  });
});

test("reply can take a callback", function(t) {
  var dataCalled = false;

  var scope = nock('http://www.google.com')
    .get('/')
    .reply(200, function(path, requestBody, callback) {
      callback(null, "Hello World!");
    });

  var req = http.request({
      host: "www.google.com",
      path: '/',
      port: 80
  }, function(res) {

    t.equal(res.statusCode, 200, "Status code is 200");
    res.on('end', function() {
      t.ok(dataCalled, "data handler was called");
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
});

test("reply should throw on error on the callback", function(t) {
  var dataCalled = false;

  var scope = nock('http://www.google.com')
    .get('/')
    .reply(500, function(path, requestBody, callback) {
      callback(new Error("Database failed"));
    });

  var req = http.request({
      host: "www.google.com",
      path: '/',
      port: 80
  }, function(res) {
    t.equal(res.statusCode, 500, "Status code is 500");

    res.on('data', function(data) {
      dataCalled = true;
      t.ok(data instanceof Buffer, "data should be buffer");
      t.ok(data.toString().indexOf("Error: Database failed") === 0, "response should match");
    });

    res.on('end', function() {
      t.ok(dataCalled, "data handler was called");
      scope.done();
      t.end();
    });
  });

  req.end();
});

test("get gets mocked", function(t) {
  var dataCalled = false;

  var scope = nock('http://www.google.com')
    .get('/')
    .reply(200, "Hello World!");

  var req = http.request({
      host: "www.google.com",
      path: '/',
      port: 80
  }, function(res) {

    t.equal(res.statusCode, 200, "Status code is 200");
    res.on('end', function() {
      t.ok(dataCalled, "data handler was called");
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
});

test("get gets mocked with relative base path", function(t) {
  var dataCalled = false;

  var scope = nock('http://www.google.com/abc')
    .get('/def')
    .reply(200, "Hello World!");

  var req = http.request({
      host: "www.google.com",
      path: '/abc/def',
      port: 80
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
});

test("post", function(t) {
  var dataCalled = false;

  var scope = nock('http://www.google.com')
     .post('/form')
     .reply(201, "OK!");

   var req = http.request({
       host: "www.google.com",
       method: 'POST',
       path: '/form',
       port: 80
   }, function(res) {

     t.equal(res.statusCode, 201);
     res.on('end', function() {
       t.ok(dataCalled);
       scope.done();
       t.end();
     });
     res.on('data', function(data) {
       dataCalled = true;
       t.ok(data instanceof Buffer, "data should be buffer");
       t.equal(data.toString(), "OK!", "response should match");
     });

   });

   req.end();
});



test("post with empty response body", function(t) {
  var scope = nock('http://www.google.com')
     .post('/form')
     .reply(200);

   var req = http.request({
       host: "www.google.com",
       method: 'POST',
       path: '/form',
       port: 80
   }, function(res) {

     t.equal(res.statusCode, 200);
     res.on('end', function() {
       scope.done();
       t.end();
     });
     res.on('data', function() {
       t.fail("No body should be returned");
     });

   });
   req.end();
});

test("post, lowercase", function(t) {
  var dataCalled = false;

  var scope = nock('http://www.google.com')
     .post('/form')
     .reply(200, "OK!");

   var req = http.request({
       host: "www.google.com",
       method: 'post',
       path: '/form',
       port: 80
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
       t.equal(data.toString(), "OK!", "response should match");
     });

   });

   req.end();
});

test("get with reply callback", function(t) {
  var scope = nock('http://www.google.com')
     .get('/')
     .reply(200, function() {
        return 'OK!';
     });

  var req = http.request({
    host: "www.google.com",
    path: '/',
    port: 80
  }, function(res) {
    res.on('end', function() {
      scope.done();
      t.end();
    });
    res.on('data', function(data) {
      t.equal(data.toString(), 'OK!', 'response should match');
    });
  });

  req.end();
});

test("get to different subdomain with reply callback and filtering scope",
function(t) {
  //  We scope for www.google.com but through scope filtering we
  //  will accept any <subdomain>.google.com
  var scope = nock('http://www.google.com', {
      filteringScope: function(scope) {
        return /^http:\/\/.*\.google\.com/.test(scope);
      }
    })
    .get('/')
    .reply(200, function() {
      return 'OK!';
    });

  var req = http.request({
     host: "any-subdomain-will-do.google.com",
     path: '/',
     port: 80
  }, function(res) {
    res.on('end', function() {
      scope.done();
      t.end();
    });
    res.on('data', function(data) {
      t.equal(data.toString(), 'OK!', 'response should match');
    });
  });

  req.end();
});

test("get with reply callback returning object", function(t) {
  var scope = nock('http://www.googlezzzz.com')
     .get('/')
     .reply(200, function() {
        return { message: 'OK!' };
     });

  var req = http.request({
    host: "www.googlezzzz.com",
    path: '/',
    port: 80
  }, function(res) {
    res.on('end', function() {
      scope.done();
      t.end();
    });
    res.on('data', function(data) {
      t.equal(data.toString(), JSON.stringify({ message: 'OK!' }),
        'response should match');
    });
  });

  req.end();
});

test("post with reply callback, uri, and request body", function(t) {
  var input = 'key=val';

  var scope = nock('http://www.google.com')
     .post('/echo', input)
     .reply(200, function(uri, body) {
        return ['OK', uri, body].join(' ');
     });

  var req = http.request({
     host: "www.google.com"
    , method: 'POST'
    , path: '/echo'
    , port: 80
  }, function(res) {
    res.on('end', function() {
      scope.done();
      t.end();
    });
    res.on('data', function(data) {
      t.equal(data.toString(), 'OK /echo key=val' , 'response should match');
    });
  });

  req.write(input);
  req.end();
});

test("post with regexp as spec", function(t) {
    var scope = nock('http://www.google.com')
        .post('/echo', /key=v.?l/g)
        .reply(200, function(uri, body) {
            return ['OK', uri, body].join(' ');
        });

    var req = http.request({
        host: "www.google.com"
        , method: 'POST'
        , path: '/echo'
        , port: 80
    }, function(res) {
        res.on('end', function() {
            scope.done();
            t.end();
        });
        res.on('data', function(data) {
            t.equal(data.toString(), 'OK /echo key=val' , 'response should match');
        });
    });

    req.write('key=val');
    req.end();
});

test("post with function as spec", function(t) {
    var scope = nock('http://www.google.com')
        .post('/echo', function(body) {
          return body === 'key=val';
        })
        .reply(200, function(uri, body) {
            return ['OK', uri, body].join(' ');
        });

    var req = http.request({
        host: "www.google.com"
        , method: 'POST'
        , path: '/echo'
        , port: 80
    }, function(res) {
        res.on('end', function() {
            scope.done();
            t.end();
        });
        res.on('data', function(data) {
            t.equal(data.toString(), 'OK /echo key=val' , 'response should match');
        });
    });

    req.write('key=val');
    req.end();
});

test("post with chaining on call", function(t) {
  var input = 'key=val';

  var scope = nock('http://www.google.com')
     .post('/echo', input)
     .reply(200, function(uri, body) {
        return ['OK', uri, body].join(' ');
     });

  var req = http.request({
     host: "www.google.com"
    , method: 'POST'
    , path: '/echo'
    , port: 80
  }, function(res) {
    res.on('end', function() {
      scope.done();
      t.end();
    });
    res.on('data', function(data) {
      t.equal(data.toString(), 'OK /echo key=val' , 'response should match');
    });
  }).on('error', function(error){
    t.equal(error, null);
    t.end();
  });
  req.end(input);
});

test("reply with callback and filtered path and body", function(t) {
  var noPrematureExecution = false;

  var scope = nock('http://www.realcallback.com')
     .filteringPath(/.*/, '*')
     .filteringRequestBody(/.*/, '*')
     .post('*', '*')
     .reply(200,  function(uri, body) {
         t.assert(noPrematureExecution);
         return ['OK', uri, body].join(' ');
      });

  var req = http.request({
     host: "www.realcallback.com"
    , method: 'POST'
    , path: '/original/path'
    , port: 80
  }, function(res) {
   t.equal(res.statusCode, 200);
   res.on('end', function() {
     scope.done();
     t.end();
   });
   res.on('data', function(data) {
     t.equal(data.toString(), 'OK /original/path original=body' , 'response should match');
   });
  });

  noPrematureExecution = true;
  req.end('original=body');
});

test("isDone", function(t) {
  var scope = nock('http://www.google.com')
    .get('/')
    .reply(200, "Hello World!");

  t.notOk(scope.isDone(), "not done when a request is outstanding");

  var req = http.request({
      host: "www.google.com"
    , path: '/'
    , port: 80
  }, function(res) {
    t.equal(res.statusCode, 200);
    res.on('end', function() {
      t.ok(scope.isDone(), "done after request is made");
      scope.done();
      t.end();
    });
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();
  });

  req.end();
});

test("requireDone", function(t) {
  var scope = nock('http://www.google.com')
    .get('/', false, { requireDone: false })
    .reply(200, "Hello World!");

  t.ok(scope.isDone(), "done when a requireDone is set to false");

  scope.get('/', false, { requireDone: true})
       .reply(200, "Hello World!");

  t.notOk(scope.isDone(), "not done when a requireDone is explicitly set to true");

  nock.cleanAll()
  t.end();
});

test("request headers exposed", function(t) {

  var scope = nock('http://www.headdy.com')
     .get('/')
     .reply(200, "Hello World!", {'X-My-Headers': 'My Header value'});

  var req = http.get({
     host: "www.headdy.com"
    , method: 'GET'
    , path: '/'
    , port: 80
    , headers: {'X-My-Headers': 'My custom Header value'}
  }, function(res) {
    res.on('end', function() {
      scope.done();
      t.end();
    });
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();
  });

  t.equivalent(req._headers, {'x-my-headers': 'My custom Header value', 'host': 'www.headdy.com'});
});

test("headers work", function(t) {

  var scope = nock('http://www.headdy.com')
     .get('/')
     .reply(200, "Hello World!", {'X-My-Headers': 'My Header value'});

  var req = http.request({
     host: "www.headdy.com"
    , method: 'GET'
    , path: '/'
    , port: 80
  }, function(res) {
   t.equal(res.statusCode, 200);
   res.on('end', function() {
     t.equivalent(res.headers, {'x-my-headers': 'My Header value'});
     scope.done();
     t.end();
   });
   // Streams start in 'paused' mode and must be started.
   // See https://nodejs.org/api/stream.html#stream_class_stream_readable
   res.resume();
  });

  req.end();

});

test("reply headers work with function", function(t) {

  var scope = nock('http://replyheadersworkwithfunction.xxx')
     .get('/')
     .reply(200, function() {
       return 'ABC';
     }, {'X-My-Headers': 'My custom header value'});

  var req = http.get({
     host: "replyheadersworkwithfunction.xxx",
     path: '/',
     port: 80
  }, function(res) {
    t.equivalent(res.headers, {'x-my-headers': 'My custom header value'});
    scope.done();
    t.end();

  });
});

test("reply headers as function work", function(t) {
  var scope = nock('http://example.com')
  .get('/')
  .reply(200, 'boo!', {
    'X-My-Headers': function (req, res, body) {
      return body.toString();
    }
  });

  var req = http.get({
    host: 'example.com',
    path: '/'
  }, function (res) {
    t.equivalent(res.headers, { 'x-my-headers': 'boo!' });
    t.equivalent(res.rawHeaders, ['x-my-headers', 'boo!']);  // 67
    t.end();
  });
});

test("match headers", function(t) {
  var scope = nock('http://www.headdy.com')
     .get('/')
     .matchHeader('x-my-headers', 'My custom Header value')
     .reply(200, "Hello World!");

  http.get({
     host: "www.headdy.com"
    , method: 'GET'
    , path: '/'
    , port: 80
    , headers: {'X-My-Headers': 'My custom Header value'}
  }, function(res) {
    res.setEncoding('utf8');
    t.equal(res.statusCode, 200);

    res.on('data', function(data) {
      t.equal(data, 'Hello World!');
    });

    res.on('end', function() {
      scope.done();
      t.end();
    });
  });

});

test("multiple match headers", function(t) {
  var scope = nock('http://www.headdy.com')
     .get('/')
     .matchHeader('x-my-headers', 'My custom Header value')
     .reply(200, "Hello World!")
     .get('/')
     .matchHeader('x-my-headers', 'other value')
     .reply(200, "Hello World other value!");

  http.get({
     host: "www.headdy.com"
    , method: 'GET'
    , path: '/'
    , port: 80
    , headers: {'X-My-Headers': 'other value'}
  }, function(res) {
    res.setEncoding('utf8');
    t.equal(res.statusCode, 200);

    res.on('data', function(data) {
      t.equal(data, 'Hello World other value!');
    });

    res.on('end', function() {
      http.get({
         host: "www.headdy.com"
        , method: 'GET'
        , path: '/'
        , port: 80
        , headers: {'X-My-Headers': 'My custom Header value'}
      }, function(res) {
        res.setEncoding('utf8');
        t.equal(res.statusCode, 200);

        res.on('data', function(data) {
          t.equal(data, 'Hello World!');
        });

        res.on('end', function() {
          scope.done();
          t.end();
        });
      });
    });
  });

});

test("match headers with regexp", function(t) {
  var scope = nock('http://www.headier.com')
     .get('/')
     .matchHeader('x-my-headers', /My He.d.r [0-9.]+/)
     .reply(200, "Hello World!");

  http.get({
     host: "www.headier.com"
    , method: 'GET'
    , path: '/'
    , port: 80
    , headers: {'X-My-Headers': 'My Header 1.0'}
  }, function(res) {
    res.setEncoding('utf8');
    t.equal(res.statusCode, 200);

    res.on('data', function(data) {
      t.equal(data, 'Hello World!');
    });

    res.on('end', function() {
      scope.done();
      t.end();
    });
  });

});

test("match headers on number with regexp", function(t) {
  var scope = nock('http://www.headier.com')
     .get('/')
     .matchHeader('x-my-headers', /\d+/)
     .reply(200, "Hello World!");

  http.get({
     host: "www.headier.com"
    , method: 'GET'
    , path: '/'
    , port: 80
    , headers: {'X-My-Headers': 123}
  }, function(res) {
    res.setEncoding('utf8');
    t.equal(res.statusCode, 200);

    res.on('data', function(data) {
      t.equal(data, 'Hello World!');
    });

    res.on('end', function() {
      scope.done();
      t.end();
    });
  });

});

test("match headers with function", function(t) {
  var scope = nock('http://www.headier.com')
     .get('/')
     .matchHeader('x-my-headers', function (val) {
        return val > 123;
     })
     .reply(200, "Hello World!");

  http.get({
     host: "www.headier.com"
    , method: 'GET'
    , path: '/'
    , port: 80
    , headers: {'X-My-Headers': 456}
  }, function(res) {
    res.setEncoding('utf8');
    t.equal(res.statusCode, 200);

    res.on('data', function(data) {
      t.equal(data, 'Hello World!');
    });

    res.on('end', function() {
      scope.done();
      t.end();
    });
  });

});

test("match all headers", function(t) {
  var scope = nock('http://api.headdy.com')
     .matchHeader('accept', 'application/json')
     .get('/one')
     .reply(200, { hello: "world" })
     .get('/two')
     .reply(200, { a: 1, b: 2, c: 3 });

  var ended = 0;
  function callback() {
    ended += 1;
    if (ended === 2) {
      scope.done();
      t.end();
    }
  }

  http.get({
     host: "api.headdy.com"
    , path: '/one'
    , port: 80
    , headers: {'Accept': 'application/json'}
  }, function(res) {
    res.setEncoding('utf8');
    t.equal(res.statusCode, 200);

    res.on('data', function(data) {
      t.equal(data, '{"hello":"world"}');
    });

    res.on('end', callback);
  });

  http.get({
     host: "api.headdy.com"
    , path: '/two'
    , port: 80
    , headers: {'accept': 'application/json'}
  }, function(res) {
    res.setEncoding('utf8');
    t.equal(res.statusCode, 200);

    res.on('data', function(data) {
      t.equal(data, '{"a":1,"b":2,"c":3}');
    });

    res.on('end', callback);
  });

});

test("header manipulation", function(t) {
  var scope = nock('http://example.com')
                .get('/accounts')
                .reply(200, { accounts: [{ id: 1, name: 'Joe Blow' }] })
    , req;

  req = http.get({ host: 'example.com', path: '/accounts' }, function (res) {
    res.on('end', function () {
      scope.done();
      t.end();
    });
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();
  });

  req.setHeader('X-Custom-Header', 'My Value');
  t.equal(req.getHeader('X-Custom-Header'), 'My Value', 'Custom header was not set');

  req.removeHeader('X-Custom-Header');
  t.notOk(req.getHeader('X-Custom-Header'), 'Custom header was not removed');

  req.end();
});

test("head", function(t) {
  var dataCalled = false;

  var scope = nock('http://www.google.com')
     .head('/form')
     .reply(201, "OK!");

   var req = http.request({
       host: "www.google.com"
     , method: 'HEAD'
     , path: '/form'
     , port: 80
   }, function(res) {

     t.equal(res.statusCode, 201);
     res.on('end', function() {
       scope.done();
       t.end();
     });
     // Streams start in 'paused' mode and must be started.
     // See https://nodejs.org/api/stream.html#stream_class_stream_readable
     res.resume();
   });

   req.end();
});

test("body data is differentiating", function(t) {
  var doneCount = 0
    , scope = nock('http://www.boddydiff.com')
               .post('/', 'abc')
               .reply(200, "Hey 1")
               .post('/', 'def')
               .reply(200, "Hey 2");

   function done(t) {
     doneCount += 1;
     t.end();
   };


  t.test("A", function(t) {
    var req = http.request({
       host: "www.boddydiff.com"
      , method: 'POST'
      , path: '/'
      , port: 80
    }, function(res) {
       var dataCalled = false;
       t.equal(res.statusCode, 200);
       res.on('end', function() {
         t.ok(dataCalled);
         done(t);
       });
       res.on('data', function(data) {
         dataCalled = true;
         t.ok(data instanceof Buffer, "data should be buffer");
         t.equal(data.toString(), "Hey 1", "response should match");
       });
    });

    req.end('abc');
  });

  t.test("B", function(t) {
    var req = http.request({
       host: "www.boddydiff.com"
      , method: 'POST'
      , path: '/'
      , port: 80
    }, function(res) {
       var dataCalled = false;
       t.equal(res.statusCode, 200);
       res.on('end', function() {
         t.ok(dataCalled);
         done(t);
       });
       res.on('data', function(data) {
         dataCalled = true;
         t.ok(data instanceof Buffer, "data should be buffer");
         t.equal(data.toString(), "Hey 2", "response should match");
       });
    });

    req.end('def');
  });

});

test("chaining", function(t) {
  var repliedCount = 0;
  var scope = nock('http://www.spiffy.com')
     .get('/')
     .reply(200, "Hello World!")
     .post('/form')
     .reply(201, "OK!");

   function endOne(t) {
     repliedCount += 1;
     if (t === 2) {
       scope.done();
     }
     t.end();
   }

   t.test("post", function(t) {
     var dataCalled;
     var req = http.request({
         host: "www.spiffy.com"
       , method: 'POST'
       , path: '/form'
       , port: 80
     }, function(res) {

       t.equal(res.statusCode, 201);
       res.on('end', function() {
         t.ok(dataCalled);
         endOne(t);
       });
       res.on('data', function(data) {
         dataCalled = true;
         t.ok(data instanceof Buffer, "data should be buffer");
         t.equal(data.toString(), "OK!", "response should match");
       });

     });

     req.end();
   });

   t.test("get", function(t) {
     var dataCalled;
     var req = http.request({
         host: "www.spiffy.com"
       , method: 'GET'
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
   });
});

test("encoding", function(t) {
  var dataCalled = false

  var scope = nock('http://www.encoderz.com')
    .get('/')
    .reply(200, "Hello World!");

  var req = http.request({
      host: "www.encoderz.com"
    , path: '/'
    , port: 80
  }, function(res) {

    res.setEncoding('base64');

    t.equal(res.statusCode, 200);
    res.on('end', function() {
      t.ok(dataCalled);
      scope.done();
      t.end();
    });
    res.on('data', function(data) {
      dataCalled = true;
      t.type(data, 'string', "data should be string");
      t.equal(data, "SGVsbG8gV29ybGQh", "response should match base64 encoding");
    });

  });

  req.end();
});

test("reply with file", function(t) {
  var dataCalled = false

  var scope = nock('http://www.filereplier.com')
    .get('/')
    .replyWithFile(200, __dirname + '/../assets/reply_file_1.txt')
    .get('/test')
    .reply(200, 'Yay!');

  var req = http.request({
      host: "www.filereplier.com"
    , path: '/'
    , port: 80
  }, function(res) {

    t.equal(res.statusCode, 200);
    res.on('end', function() {
      t.ok(dataCalled);
      t.end();
    });
    res.on('data', function(data) {
      dataCalled = true;
      t.equal(data.toString(), "Hello from the file!", "response should match");
    });

  });

  req.end();

});

test("reply with file and pipe response", function(t) {
  var scope = nock('http://www.files.com')
    .get('/')
    .replyWithFile(200, __dirname + '/../assets/reply_file_1.txt')

  var req = http.get({
      host: "www.files.com"
    , path: '/'
    , port: 80
  }, function(res) {
    var str = '';
    var fakeStream = new(require('stream').Stream);
    fakeStream.writable = true;

    fakeStream.write = function(d) {
      str += d;
    };

    fakeStream.end = function() {
      t.equal(str, "Hello from the file!", "response should match");
      t.end();
    };

    res.pipe(fakeStream);
    res.setEncoding('utf8');
    t.equal(res.statusCode, 200);

  });

});

test("reply with file with headers", function(t) {
  var dataCalled = false

  var scope = nock('http://www.filereplier2.com')
    .get('/')
    .replyWithFile(200, __dirname + '/../assets/reply_file_2.txt.gz', {
      'content-encoding': 'gzip'
    });

  var req = http.request({
      host: "www.filereplier2.com"
    , path: '/'
    , port: 80
  }, function(res) {

    t.equal(res.statusCode, 200);
    res.on('end', function() {
      t.ok(dataCalled);
      t.end();
    });
    res.on('data', function(data) {
      dataCalled = true;
      t.equal(data.length, 57);
    });

  });

  req.end();

});

test("reply with file with mikeal/request", function(t) {
  var scope = nock('http://www.files.com')
    .get('/')
    .replyWithFile(200, __dirname + '/../assets/reply_file_1.txt')

  var options = { uri: 'http://www.files.com/', onResponse: true };
  mikealRequest('http://www.files.com/', function(err, res, body) {
    if (err) {
      throw err;
    }

    res.setEncoding('utf8');
    t.equal(res.statusCode, 200);

    t.equal(body, "Hello from the file!", "response should match");
    t.end();
  });

});

test("reply with JSON", function(t) {
  var dataCalled = false

  var scope = nock('http://www.jsonreplier.com')
    .get('/')
    .reply(200, {hello: "world"});

  var req = http.request({
      host: "www.jsonreplier.com"
    , path: '/'
    , port: 80
  }, function(res) {

    res.setEncoding('utf8');
    t.equal(res.statusCode, 200);
    t.notOk(res.headers['date']);
    t.notOk(res.headers['content-length']);
    t.equal(res.headers['content-type'], 'application/json');
    res.on('end', function() {
      t.ok(dataCalled);
      scope.done();
      t.end();
    });
    res.on('data', function(data) {
      dataCalled = true;
      t.equal(data.toString(), '{"hello":"world"}', "response should match");
    });

  });

  req.end();

});

test("reply with content-length header", function(t){
  var scope = nock('http://www.jsonreplier.com')
    .replyContentLength()
    .get('/')
    .reply(200, {hello: "world"});

  var req = http.get({
      host: "www.jsonreplier.com"
    , path: '/'
    , port: 80
  }, function(res) {
    t.equal(res.headers['content-length'], 17);
    res.on('end', function() {
      scope.done();
      t.end();
    });
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();
  });
});

test("reply with date header", function(t){
  var date = new Date();

  var scope = nock('http://www.jsonreplier.com')
    .replyDate(date)
    .get('/')
    .reply(200, {hello: "world"});

  var req = http.get({
    host: "www.jsonreplier.com"
    , path: '/'
    , port: 80
  }, function(res) {
    console.error(res.headers);
    t.equal(res.headers['date'], date.toUTCString());
    res.on('end', function() {
      scope.done();
      t.end();
    });
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();
  });
});

test("filter path with function", function(t) {
  var scope = nock('http://www.filterurls.com')
     .filteringPath(function(path) {
        return '/?a=2&b=1';
      })
     .get('/?a=2&b=1')
     .reply(200, "Hello World!");

  var req = http.request({
     host: "www.filterurls.com"
    , method: 'GET'
    , path: '/?a=1&b=2'
    , port: 80
  }, function(res) {
   t.equal(res.statusCode, 200);
   res.on('end', function() {
     scope.done();
     t.end();
   });
   // Streams start in 'paused' mode and must be started.
   // See https://nodejs.org/api/stream.html#stream_class_stream_readable
   res.resume();
  });

  req.end();
});

test("filter path with regexp", function(t) {
  var scope = nock('http://www.filterurlswithregexp.com')
     .filteringPath(/\d/g, '3')
     .get('/?a=3&b=3')
     .reply(200, "Hello World!");

  var req = http.request({
     host: "www.filterurlswithregexp.com"
    , method: 'GET'
    , path: '/?a=1&b=2'
    , port: 80
  }, function(res) {
   t.equal(res.statusCode, 200);
   res.on('end', function() {
     scope.done();
     t.end();
   });
   // Streams start in 'paused' mode and must be started.
   // See https://nodejs.org/api/stream.html#stream_class_stream_readable
   res.resume();
  });

  req.end();
});

test("filter body with function", function(t) {
  var filteringRequestBodyCounter = 0;

  var scope = nock('http://www.filterboddiez.com')
     .filteringRequestBody(function(body) {
        ++filteringRequestBodyCounter;
        t.equal(body, 'mamma mia');
        return 'mamma tua';
      })
     .post('/', 'mamma tua')
     .reply(200, "Hello World!");

  var req = http.request({
     host: "www.filterboddiez.com"
    , method: 'POST'
    , path: '/'
    , port: 80
  }, function(res) {
   t.equal(res.statusCode, 200);
   res.on('end', function() {
     scope.done();
     t.equal(filteringRequestBodyCounter, 1);
     t.end();
   });
   // Streams start in 'paused' mode and must be started.
   // See https://nodejs.org/api/stream.html#stream_class_stream_readable
   res.resume();
  });

  req.end('mamma mia');
});

test("filter body with regexp", function(t) {
  var scope = nock('http://www.filterboddiezregexp.com')
     .filteringRequestBody(/mia/, 'nostra')
     .post('/', 'mamma nostra')
     .reply(200, "Hello World!");

  var req = http.request({
     host: "www.filterboddiezregexp.com"
    , method: 'POST'
    , path: '/'
    , port: 80
  }, function(res) {
   t.equal(res.statusCode, 200);
   res.on('end', function() {
     scope.done();
     t.end();
   });
   // Streams start in 'paused' mode and must be started.
   // See https://nodejs.org/api/stream.html#stream_class_stream_readable
   res.resume();
  });

  req.end('mamma mia');
});

test("abort request", function(t) {
  var scope = nock('http://www.google.com')
    .get('/hey')
    .reply(200, 'nobody');

  var req = http.request({
    host: 'www.google.com'
   , path: '/hey'
  });

  req.on('response', function(res) {
    res.on('close', function(err) {
      t.equal(err.code, 'aborted');
      scope.done();
      t.end();
    });

    res.on('end', function() {
      t.true(false, 'this should never execute');
    });

    req.abort();
  });

  req.end();
});

test("pause response before data", function(t) {
  var scope = nock('http://www.mouse.com')
    .get('/pauser')
    .reply(200, 'nobody');

  var req = http.request({
    host: 'www.mouse.com'
   , path: '/pauser'
  });

  req.on('response', function(res) {
    res.pause();

    var waited = false;
    setTimeout(function() {
      waited = true;
      res.resume();
    }, 500);

    res.on('data', function(data) {
      t.true(waited);
    });

    res.on('end', function() {
      scope.done();
      t.end();
    });
  });

  req.end();
});

test("pause response after data", function(t) {
  var response = new stream.PassThrough();
  var scope = nock('http://pauseme.com')
    .get('/')
    // Node does not pause the 'end' event so we need to use a stream to simulate
    // multiple 'data' events.
    .reply(200, response);

  var req = http.get({
    host: 'pauseme.com'
   , path: '/'
  }, function(res) {
    var waited = false;
    setTimeout(function() {
      waited = true;
      res.resume();
    }, 500);

    res.on('data', function(data) {
      res.pause();
    });

    res.on('end', function() {
      t.true(waited);
      scope.done();
      t.end();
    });
  });

  // Manually simulate multiple 'data' events.
  response.emit("data", "one");
  setTimeout(function () {
    response.emit("data", "two");
    response.end();
  }, 0);
});

test("response pipe", function(t) {
  var dest = (function() {
    function Constructor() {
      events.EventEmitter.call(this);

      this.buffer = new Buffer(0);
      this.writable = true;
    }

    util.inherits(Constructor, events.EventEmitter);

    Constructor.prototype.end = function() {
      this.emit('end');
    };

    Constructor.prototype.write = function(chunk) {
      var buf = new Buffer(this.buffer.length + chunk.length);

      this.buffer.copy(buf);
      chunk.copy(buf, this.buffer.length);

      this.buffer = buf;

      return true;
    };

    return new Constructor();
  })();

  var scope = nock('http://pauseme.com')
    .get('/')
    .reply(200, 'nobody');

  var req = http.get({
    host: 'pauseme.com'
   , path: '/'
  }, function(res) {
    dest.on('pipe', function() {
      t.pass('should emit "pipe" event')
    });

    dest.on('end', function() {
      scope.done();
      t.equal(dest.buffer.toString(), 'nobody');
      t.end();
    });

    res.pipe(dest);
  });
});

test("response pipe without implicit end", function(t) {
  var dest = (function() {
    function Constructor() {
      events.EventEmitter.call(this);

      this.buffer = new Buffer(0);
      this.writable = true;
    }

    util.inherits(Constructor, events.EventEmitter);

    Constructor.prototype.end = function() {
      this.emit('end');
    };

    Constructor.prototype.write = function(chunk) {
      var buf = new Buffer(this.buffer.length + chunk.length);

      this.buffer.copy(buf);
      chunk.copy(buf, this.buffer.length);

      this.buffer = buf;

      return true;
    };

    return new Constructor();
  })();

  var scope = nock('http://pauseme.com')
    .get('/')
    .reply(200, 'nobody');

  var req = http.get({
    host: 'pauseme.com'
   , path: '/'
  }, function(res) {
    dest.on('end', function() {
      t.fail('should not call end implicitly');
    });

    res.on('end', function() {
      scope.done();
      t.pass('should emit end event');
      t.end();
    });

    res.pipe(dest, {end: false});
  });
});

test("chaining API", function(t) {
  var scope = nock('http://chainchomp.com')
    .get('/one')
    .reply(200, 'first one')
    .get('/two')
    .reply(200, 'second one');

  http.get({
    host: 'chainchomp.com'
   , path: '/one'
  }, function(res) {
    res.setEncoding('utf8');
    t.equal(res.statusCode, 200, 'status should be ok');
    res.on('data', function(data) {
      t.equal(data, 'first one', 'should be equal to first reply');
    });

    res.on('end', function() {

      http.get({
        host: 'chainchomp.com'
       , path: '/two'
      }, function(res) {
        res.setEncoding('utf8');
        t.equal(res.statusCode, 200, 'status should be ok');
        res.on('data', function(data) {
          t.equal(data, 'second one', 'should be qual to second reply');
        });

        res.on('end', function() {
          scope.done();
          t.end();
        });
      });

    });
  });
});

test("same URI", function(t) {
  var scope = nock('http://sameurii.com')
    .get('/abc')
    .reply(200, 'first one')
    .get('/abc')
    .reply(200, 'second one');

  http.get({
    host: 'sameurii.com'
   , path: '/abc'
  }, function(res) {
    res.on('data', function(data) {
      res.setEncoding('utf8');
      t.equal(data.toString(), 'first one', 'should be qual to first reply');
      res.on('end', function() {
        http.get({
          host: 'sameurii.com'
         , path: '/abc'
        }, function(res) {
          res.setEncoding('utf8');
          res.on('data', function(data) {
            t.equal(data.toString(), 'second one', 'should be qual to second reply');
            res.on('end', function() {
              scope.done();
              t.end();
            });
          });
        });
      });
    });
  });
});

test("can use hostname instead of host", function(t) {
  var scope = nock('http://www.google.com')
    .get('/')
    .reply(200, "Hello World!");

  var req = http.request({
      hostname: "www.google.com"
    , path: '/'
  }, function(res) {

    t.equal(res.statusCode, 200);
    res.on('end', function() {
      scope.done();
      t.end();
    });
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();
  });

  req.end();
});

test('hostname is case insensitive', function(t) {
  var scope = nock('http://caseinsensitive.com')
     .get('/path')
     .reply(200, "hey");

  var options = {
    hostname: 'cASEinsensitivE.com',
    path: '/path',
    method: 'GET'
  };

  var req = http.request(options, function(res) {
    scope.done();
    t.end();
  });

  req.end();
});


test("can take a port", function(t) {
  var scope = nock('http://www.myserver.com:3333')
    .get('/')
    .reply(200, "Hello World!");

  var req = http.request({
      hostname: "www.myserver.com"
    , path: '/'
    , port: 3333
  }, function(res) {

    t.equal(res.statusCode, 200);
    res.on('end', function() {
      scope.done();
      t.end();
    });
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();
  });

  req.end();
});

test("can use https", function(t) {
  var dataCalled = false

  var scope = nock('https://google.com')
    .get('/')
    .reply(200, "Hello World!");

  var req = https.request({
      host: "google.com"
    , path: '/'
  }, function(res) {
    t.equal(res.statusCode, 200);
    res.on('end', function() {
      t.ok(dataCalled, 'data event called');
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
});

test("emits error if https route is missing", function(t) {
  var dataCalled = false

  var scope = nock('https://google.com')
    .get('/')
    .reply(200, "Hello World!");

  var req = https.request({
      host: "google.com"
    , path: '/abcdef892932'
  }, function(res) {
    throw new Error('should not come here!');
  });

  req.end();

  // This listener is intentionally after the end call so make sure that
  // listeners added after the end will catch the error
  req.on('error', function (err) {
    t.equal(err.message.trim(), 'Nock: No match for request GET https://google.com/abcdef892932');
    t.end();
  });
});

test("emits error if https route is missing", function(t) {
  var dataCalled = false

  var scope = nock('https://google.com:123')
    .get('/')
    .reply(200, "Hello World!");

  var req = https.request({
      host: "google.com",
      port: 123,
      path: '/dsadsads'
  }, function(res) {
    throw new Error('should not come here!');
  });

  req.end();

  // This listener is intentionally after the end call so make sure that
  // listeners added after the end will catch the error
  req.on('error', function (err) {
    t.equal(err.message.trim(), 'Nock: No match for request GET https://google.com:123/dsadsads');
    t.end();
  });
});

test("can use ClientRequest using GET", function(t) {

  var dataCalled = false

  var scope = nock('http://www2.clientrequester.com')
    .get('/dsad')
    .reply(202, "HEHE!");

  var req = new http.ClientRequest({
      host: "www2.clientrequester.com"
    , path: '/dsad'
  });
  req.end();

  req.on('response', function(res) {
    t.equal(res.statusCode, 202);
    res.on('end', function() {
      t.ok(dataCalled, "data event was called");
      scope.done();
      t.end();
    });
    res.on('data', function(data) {
      dataCalled = true;
      t.ok(data instanceof Buffer, "data should be buffer");
      t.equal(data.toString(), "HEHE!", "response should match");
    });
  });

  req.end();
});

test("can use ClientRequest using POST", function(t) {

  var dataCalled = false

  var scope = nock('http://www2.clientrequester.com')
    .post('/posthere/please', 'heyhey this is the body')
    .reply(201, "DOOONE!");

  var req = new http.ClientRequest({
      host: "www2.clientrequester.com"
    , path: '/posthere/please'
    , method: 'POST'
  });
  req.write('heyhey this is the body');
  req.end();

  req.on('response', function(res) {
    t.equal(res.statusCode, 201);
    res.on('end', function() {
      t.ok(dataCalled, "data event was called");
      scope.done();
      t.end();
    });
    res.on('data', function(data) {
      dataCalled = true;
      t.ok(data instanceof Buffer, "data should be buffer");
      t.equal(data.toString(), "DOOONE!", "response should match");
    });
  });

  req.end();
});

test("same url matches twice", function(t) {
  var scope = nock('http://www.twicematcher.com')
     .get('/hey')
     .reply(200, "First match")
     .get('/hey')
     .reply(201, "Second match");

  var replied = 0;

  function callback() {
    replied += 1;
    if (replied == 2) {
      scope.done();
      t.end();
    }
  }

  http.get({
     host: "www.twicematcher.com"
    , path: '/hey'
  }, function(res) {
    t.equal(res.statusCode, 200);

    res.on('data', function(data) {
      t.equal(data.toString(), 'First match', 'should match first request response body');
    });

    res.on('end', callback);
  });

  http.get({
     host: "www.twicematcher.com"
    , path: '/hey'
  }, function(res) {
    t.equal(res.statusCode, 201);

    res.on('data', function(data) {
      t.equal(data.toString(), 'Second match', 'should match second request response body');
    });

    res.on('end', callback);
  });

});

test("scopes are independent", function(t) {
  var scope1 = nock('http://www34.google.com')
    .get('/')
    .reply(200, "Hello World!");
  var scope2 = nock('http://www34.google.com')
    .get('/')
    .reply(200, "Hello World!");

  var req = http.request({
      host: "www34.google.com"
    , path: '/'
    , port: 80
  }, function(res) {
    res.on('end', function() {
      t.ok(scope1.isDone());
      t.ok(! scope2.isDone()); // fails
      t.end();
    });
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();
  });

  req.end();
});

test("two scopes with the same request are consumed", function(t) {
  var scope1 = nock('http://www36.google.com')
    .get('/')
    .reply(200, "Hello World!");

  var scope2 = nock('http://www36.google.com')
    .get('/')
    .reply(200, "Hello World!");

  var doneCount = 0;
  function done() {
    doneCount += 1;
    if (doneCount == 2) {
      t.end();
    }
  }

  for (var i = 0; i < 2; i += 1) {
    var req = http.request({
        host: "www36.google.com"
      , path: '/'
      , port: 80
    }, function(res) {
      res.on('end', done);
      // Streams start in 'paused' mode and must be started.
      // See https://nodejs.org/api/stream.html#stream_class_stream_readable
      res.resume();
    });

    req.end();
  }
});

test("allow unmocked option works", function(t) {
  var scope = nock('http://www.google.com', {allowUnmocked: true})
    .get('/abc')
    .reply(200, 'Hey!')
    .get('/wont/get/here')
    .reply(200, 'Hi!');

  function secondIsDone() {
    t.ok(! scope.isDone());
    http.request({
        host: "www.google.com"
      , path: "/"
      , port: 80
      }, function(res) {
        res.destroy();
        t.assert(res.statusCode < 400 && res.statusCode >= 200, 'GET Google Home page');
        t.end();
      }
    ).end();
  }

  function firstIsDone() {
    t.ok(! scope.isDone());
    http.request({
        host: "www.google.com"
      , path: "/does/not/exist/dskjsakdj"
      , port: 80
      }, function(res) {
        t.assert(res.statusCode === 404, 'Google say it does not exist');
        res.on('data', function() {});
        res.on('end', secondIsDone);
      }
    ).end();
  }

  http.request({
      host: "www.google.com"
    , path: "/abc"
    , port: 80
    }, function(res) {
      res.on('end', firstIsDone);
      // Streams start in 'paused' mode and must be started.
      // See https://nodejs.org/api/stream.html#stream_class_stream_readable
      res.resume();
    }
  ).end();
});

test("default reply headers work", function(t) {
  var scope = nock('http://default.reply.headers.com')
    .defaultReplyHeaders({'X-Powered-By': 'Meeee', 'X-Another-Header': 'Hey man!'})
    .get('/')
    .reply(200, '', {A: 'b'});

  function done(res) {
    t.deepEqual(res.headers, {'x-powered-by': 'Meeee', 'x-another-header': 'Hey man!', a: 'b'});
    t.end();
  }

  http.request({
      host: 'default.reply.headers.com'
    , path: '/'
  }, done).end();
});

test("default reply headers as functions work", function(t) {
  var date = (new Date()).toUTCString();
  var message = 'A message.';

  var scope = nock('http://default.reply.headers.com')
    .defaultReplyHeaders({
      'Content-Length' : function (req, res, body) {
        return body.length;
      },

      'Date': function () {
        return date;
      },

      'Foo': function () {
        return 'foo';
      }
    })
    .get('/')
    .reply(200, message, {foo: 'bar'});

  http.request({
      host: 'default.reply.headers.com',
      path: '/'
    }, function (res) {
      t.deepEqual(
        res.headers,
        {
          'content-length': message.length,
          'date': date,
          'foo': 'bar'
        }
      );
      t.end();
    }
  ).end();
});

test("JSON encoded replies set the content-type header", function(t) {
  var scope = nock('http://localhost')
    .get('/')
    .reply(200, {
      A: 'b'
    });

  function done(res) {
    scope.done();
    t.equal(res.statusCode, 200);
    t.equal(res.headers['content-type'], 'application/json');
    t.end();
  }

  http.request({
      host: 'localhost'
    , path: '/'
  }, done).end();
});


test("JSON encoded replies does not overwrite existing content-type header", function(t) {
  var scope = nock('http://localhost')
    .get('/')
    .reply(200, {
      A: 'b'
    }, {
      'Content-Type': 'unicorns'
    });

  function done(res) {
    scope.done();
    t.equal(res.statusCode, 200);
    t.equal(res.headers['content-type'], 'unicorns');
    t.end();
  }

  http.request({
      host: 'localhost'
    , path: '/'
  }, done).end();
});

test("blank response doesn't have content-type application/json attached to it", function(t) {
  var scope = nock('http://localhost')
    .get('/')
    .reply(200);

  function done(res) {
    t.equal(res.statusCode, 200);
    t.notEqual(res.headers['content-type'], "application/json");
    t.end();
  }

  http.request({
      host: 'localhost'
    , path: '/'
  }, done).end();
});

test('clean all works', function(t) {
  var scope = nock('http://amazon.com')
    .get('/nonexistent')
    .reply(200);

  var req = http.get({host: 'amazon.com', path: '/nonexistent'}, function(res) {
    t.assert(res.statusCode === 200, "should mock before cleanup");

    nock.cleanAll();

    var req = http.get({host: 'amazon.com', path: '/nonexistent'}, function(res) {
      res.destroy();
      t.assert(res.statusCode !== 200, "should clean up properly");
      t.end();
    }).on('error', function(err) {
      t.end();
    });
  });

});

test('username and password works', function(t) {
  var scope = nock('http://passwordyy.com')
    .get('/')
    .reply(200, "Welcome, username");

  http.request({
    hostname: 'passwordyy.com',
    auth: "username:password",
    path: '/'
  }, function(res) {
    scope.done();
    t.end();
  }).end();
});


test('works with mikeal/request and username and password', function(t) {
    var scope = nock('http://passwordyyyyy.com')
      .get('/abc')
      .reply(200, "Welcome, username");

  mikealRequest({uri: 'http://username:password@passwordyyyyy.com/abc', log:true}, function(err, res, body) {
    t.ok(! err, 'error');
    t.ok(scope.isDone());
    t.equal(body, "Welcome, username");
    t.end();
  });

});

test('different ports work works', function(t) {
  var scope = nock('http://abc.portyyyy.com:8081')
    .get('/pathhh')
    .reply(200, "Welcome, username");

  http.request({
    hostname: 'abc.portyyyy.com',
    port: 8081,
    path: '/pathhh'
  }, function(res) {
    scope.done();
    t.end();
  }).end();
});

test('different ports work work with Mikeal request', function(t) {
  var scope = nock('http://abc.portyyyy.com:8082')
    .get('/pathhh')
    .reply(200, "Welcome to Mikeal Request!");

  mikealRequest.get('http://abc.portyyyy.com:8082/pathhh', function(err, res, body) {
    t.ok(! err, 'no error');
    t.equal(body, 'Welcome to Mikeal Request!');
    t.ok(scope.isDone());
    t.end();
  });
});

test('explicitly specifiying port 80 works', function(t) {
  var scope = nock('http://abc.portyyyy.com:80')
    .get('/pathhh')
    .reply(200, "Welcome, username");

  http.request({
    hostname: 'abc.portyyyy.com',
    port: 80,
    path: '/pathhh'
  }, function(res) {
    scope.done();
    t.end();
  }).end();
});

test('post with object', function(t) {
  var scope = nock('http://uri')
    .post('/claim', {some_data: "something"})
    .reply(200);

  http.request({
    hostname: 'uri',
    port: 80,
    method: "POST",
    path: '/claim'
  }, function(res) {
    scope.done();
    t.end();
  }).end('{"some_data":"something"}');

});

test('accept string as request target', function(t) {
  var dataCalled = false;
  var scope = nock('http://www.example.com')
    .get('/')
    .reply(200, "Hello World!");

  http.get('http://www.example.com', function(res) {
    t.equal(res.statusCode, 200);

    res.on('data', function(data) {
      dataCalled = true;
      t.ok(data instanceof Buffer, "data should be buffer");
      t.equal(data.toString(), "Hello World!", "response should match");
    });

    res.on('end', function() {
      t.ok(dataCalled);
      scope.done();
      t.end();
    });
  });
});

test('request has path', function(t) {
  var scope = nock('http://haspath.com')
    .get('/the/path/to/infinity')
    .reply(200);

  var req = http.request({
    hostname: 'haspath.com',
    port: 80,
    method: "GET",
    path: '/the/path/to/infinity'
  }, function(res) {
    scope.done();
    t.equal(req.path, '/the/path/to/infinity', 'should have req.path set to /the/path/to/infinity');
    t.end();
  });
  req.end();
});

test('persists interceptors', function(t) {
  var scope = nock('http://persisssists.con')
    .persist()
    .get('/')
    .reply(200, "Persisting all the way");

  t.ok(!scope.isDone());
  http.get('http://persisssists.con/', function(res) {
    t.ok(scope.isDone());
    http.get('http://persisssists.con/', function(res) {
      t.ok(scope.isDone());
      t.end();
    }).end();
  }).end();
});

test("persist reply with file", function(t) {
  var dataCalled = false

  var scope = nock('http://www.filereplier.com')
    .persist()
    .get('/')
    .replyWithFile(200, __dirname + '/../assets/reply_file_1.txt')
    .get('/test')
    .reply(200, 'Yay!');

  for (var i=0; i < 2; i++) {
    var req = http.request({
        host: "www.filereplier.com"
      , path: '/'
      , port: 80
    }, function(res) {

      t.equal(res.statusCode, 200);
      res.on('end', function() {
        t.ok(dataCalled);
      });
      res.on('data', function(data) {
        dataCalled = true;
        t.equal(data.toString(), "Hello from the file!", "response should match");
      });

    });
    req.end();
  }
  t.end();

});

test('(re-)activate after restore', function(t) {
  var scope = nock('http://google.com')
    .get('/')
    .reply(200, 'Hello, World!');

  nock.restore();
  t.false(nock.isActive());

  http.get('http://google.com/', function(res) {
    res.resume();
    res.on('end', function() {
      t.ok(!scope.isDone());

      nock.activate();
      t.true(nock.isActive());
      http.get('http://google.com', function(res) {
        res.resume();
        res.on('end', function() {
          t.ok(scope.isDone());
          t.end();
        });
      }).end();
    });
  }).end();
});

test("allow unmocked option works with https", function(t) {
  t.plan(5)
  var scope = nock('https://www.google.com', {allowUnmocked: true})
    .get('/abc')
    .reply(200, 'Hey!')
    .get('/wont/get/here')
    .reply(200, 'Hi!');

  function secondIsDone() {
    t.ok(! scope.isDone());
    https.request({
        host: "www.google.com"
      , path: "/"
    }, function(res) {
      res.resume();
      t.ok(true, 'Google replied to /');
      res.destroy();
      t.assert(res.statusCode < 400 && res.statusCode >= 200, 'GET Google Home page');
    }).end();
  }

  function firstIsDone() {
    t.ok(! scope.isDone(), 'scope is not done');
    https.request({
        host: "www.google.com"
      , path: "/does/not/exist/dskjsakdj"
    }, function(res) {
      t.equal(404, res.statusCode, 'real google response status code');
      res.on('data', function() {});
      res.on('end', secondIsDone);
    }).end();
  }

  https.request({
      host: "www.google.com"
    , path: "/abc"
  }, function(res) {
    res.on('end', firstIsDone);
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();
  }).end();
});


test('allow unmocked post with json data', function(t) {
  var scope = nock('https://httpbin.org', { allowUnmocked: true }).
    get("/abc").
    reply(200, "Hey!");

  var options = {
    method: 'POST',
    uri: 'https://httpbin.org/post',
    json: { some: 'data' }
  };

  mikealRequest(options, function(err, resp, body) {
    t.equal(200, resp.statusCode)
    t.end();
  });
});

test('allow unordered body with json encoding', function(t) {
  var scope =
  nock('http://wtfjs.org')
    .post('/like-wtf', {
      foo: 'bar',
      bar: 'foo'
    })
    .reply(200, 'Heyyyy!');

  mikealRequest({
    uri: 'http://wtfjs.org/like-wtf',
    method: 'POST',
    json: {
      bar: 'foo',
      foo: 'bar'
    }},
  function (e, r, body) {
    t.equal(body, 'Heyyyy!');
    scope.done();
    t.end();
  });
});

test('allow unordered body with form encoding', function(t) {
  var scope =
  nock('http://wtfjs.org')
    .post('/like-wtf', {
      foo: 'bar',
      bar: 'foo'
    })
    .reply(200, 'Heyyyy!');

  mikealRequest({
    uri: 'http://wtfjs.org/like-wtf',
    method: 'POST',
    form: {
      bar: 'foo',
      foo: 'bar'
    }},
  function (e, r, body) {
    t.equal(body, 'Heyyyy!');
    scope.done();
    t.end();
  });
});


test('allow string json spec', function(t) {
  var bodyObject = {bar: 'foo', foo: 'bar'};

  var scope =
  nock('http://wtfjs.org')
    .post('/like-wtf', JSON.stringify(bodyObject))
    .reply(200, 'Heyyyy!');

  mikealRequest({
    uri: 'http://wtfjs.org/like-wtf',
    method: 'POST',
    json: {
      bar: 'foo',
      foo: 'bar'
    }},
  function (e, r, body) {
    t.equal(body, 'Heyyyy!');
    scope.done();
    t.end();
  });
});

test('has a req property on the response', function(t) {
  var scope = nock('http://wtfjs.org').get('/like-wtf').reply(200);
  var req = http.request('http://wtfjs.org/like-wtf', function(res) {
    res.on('end', function() {
      t.ok(res.req, "req property doesn't exist");
      scope.done();
      t.end();
    });
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();
  });
  req.end();
});

test('disabled real HTTP request', function(t) {
  nock.disableNetConnect();

  http.get('http://www.amazon.com', function(res) {
    throw "should not request this";
  }).on('error', function(err) {
    t.equal(err.message, 'Nock: Not allow net connect for "www.amazon.com:80/"');
    t.end();
  });

  nock.enableNetConnect();
});

test('NetConnectNotAllowedError is instance of Error', function(t) {
  nock.disableNetConnect();

  http.get('http://www.amazon.com', function(res) {
    throw "should not request this";
  }).on('error', function (err) {
    t.type(err, 'Error');
    t.end();
  });

  nock.enableNetConnect();
});

test('NetConnectNotAllowedError exposes the stack', function(t) {
  nock.disableNetConnect();

  http.get('http://www.amazon.com', function(res) {
    throw "should not request this";
  }).on('error', function (err) {
    t.notEqual(err.stack, undefined);
    t.end();
  });

  nock.enableNetConnect();
});

test('enable real HTTP request only for google.com, via string', function(t) {
  nock.enableNetConnect('google.com');

  http.get('http://google.com.br/').on('error', function(err) {
    throw err;
  });

  http.get('http://www.amazon.com', function(res) {
    throw "should not deliver this request"
  }).on('error', function (err) {
    t.equal(err.message, 'Nock: Not allow net connect for "www.amazon.com:80/"');
  });

  t.end();
  nock.enableNetConnect();
});

test('enable real HTTP request only for google.com, via regexp', function(t) {
  nock.enableNetConnect(/google\.com/);

  http.get('http://google.com.br/').on('error', function(err) {
    throw err;
  });

  http.get('http://www.amazon.com', function(res) {
    throw "should not request this";
  }).on('error', function (err) {
    t.equal(err.message, 'Nock: Not allow net connect for "www.amazon.com:80/"');
    t.end();
  });

  nock.enableNetConnect();
});

test('repeating once', function(t) {
  nock.disableNetConnect();

  var _mock = nock('http://zombo.com')
    .get('/')
    .once()
    .reply(200, "Hello World!");

  http.get('http://zombo.com', function(res) {
    t.equal(200, res.statusCode, 'first request');
  });

  nock.cleanAll()
  t.end();

  nock.enableNetConnect();
});

test('repeating twice', function(t) {
  nock.disableNetConnect();

  var _mock = nock('http://zombo.com')
    .get('/')
    .twice()
    .reply(200, "Hello World!");

  for (var i=0; i < 2; i++) {
    http.get('http://zombo.com', function(res) {
      t.equal(200, res.statusCode, 'first request');
    });
  };

  nock.cleanAll()
  t.end();

  nock.enableNetConnect();
});

test('repeating thrice', function(t) {
  nock.disableNetConnect();

  var _mock = nock('http://zombo.com')
    .get('/')
    .thrice()
    .reply(200, "Hello World!");

  for (var i=0; i < 3; i++) {
    http.get('http://zombo.com', function(res) {
      t.equal(200, res.statusCode, 'first request');
    });
  };

  nock.cleanAll()
  t.end();

  nock.enableNetConnect();
});

test('repeating response 4 times', function(t) {
  nock.disableNetConnect();

  var _mock = nock('http://zombo.com')
    .get('/')
    .times(4)
    .reply(200, "Hello World!");

  for (var i=0; i < 4; i++) {
    http.get('http://zombo.com', function(res) {
      t.equal(200, res.statusCode, 'first request');
    });
  };

  nock.cleanAll()
  t.end();

  nock.enableNetConnect();
});


test('superagent works', function(t) {
  var responseText = 'Yay superagent!';
  var headers = { 'Content-Type': 'text/plain'};
  nock('http://superagent.cz')
    .get('/somepath')
    .reply(200, responseText, headers);

  superagent
  .get('http://superagent.cz/somepath')
  .end(function(err, res) {
    t.equal(res.text, responseText);
    t.end();
  });
});

test('superagent works with query string', function(t) {
  var responseText = 'Yay superagentzzz';
  var headers = { 'Content-Type': 'text/plain'};
  nock('http://superagent.cz')
    .get('/somepath?a=b')
    .reply(200, responseText, headers);

  superagent
  .get('http://superagent.cz/somepath?a=b')
  .end(function(err, res) {
    t.equal(res.text, responseText);
    t.end();
  });
});

test('superagent posts', function(t) {
  nock('http://superagent.cz')
    .post('/somepath?b=c')
    .reply(204);

  superagent
  .post('http://superagent.cz/somepath?b=c')
  .send('some data')
  .end(function(err, res) {
    t.equal(res.status, 204);
    t.end();
  });
});

test('response is streams2 compatible', function(t) {
  var responseText = 'streams2 streams2 streams2';
  nock('http://stream2hostnameftw')
    .get('/somepath')
    .reply(200, responseText);


  http.request({
      host: "stream2hostnameftw"
    , path: "/somepath"
  }, function(res) {
    res.setEncoding('utf8');

    var body = '';

    res.on('readable', function() {
      var buf;
      while (buf = res.read())
        body += buf;
    });

    res.once('end', function() {
      t.equal(body, responseText);
      t.end();
    });

  }).end();

});

test('response is an http.IncomingMessage instance', function(t) {
  var responseText = 'incoming message!';
  nock('http://example.com')
    .get('/somepath')
    .reply(200, responseText);


  http.request({
      host: "example.com"
    , path: "/somepath"
  }, function(res) {

    res.resume();
    t.true(res instanceof http.IncomingMessage);
    t.end();

  }).end();

});

function checkDuration(t, ms) {
  var _end = t.end;
  var start = process.hrtime();
  t.end = function () {
    var fin = process.hrtime(start);
    var finMs =
      (fin[0] * 1e+9) +  // seconds -> ms
      (fin[1] * 1e-6); // nanoseconds -> ms

    /// innaccurate timers
    ms = ms * 0.9;

    t.ok(finMs >= ms, 'Duration of ' + Math.round(finMs) + 'ms should be longer than ' + ms + 'ms');
    _end.call(t);
  };
}

test('calling delay delays the response', function (t) {
  checkDuration(t, 100);

  nock('http://funk')
    .get('/')
    .delay(100)
    .reply(200, 'OK');

  http.get('http://funk/', function (res) {
    res.setEncoding('utf8');

    var body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.once('end', function() {
      t.equal(body, 'OK');
      t.end();
    });
  });
});

test('using reply callback with delay provides proper arguments', function (t) {
  nock('http://localhost')
    .get('/')
    .delay(100)
    .reply(200, function (path, requestBody) {
      t.equal(path, '/', 'path arg should be set');
      t.equal(requestBody, 'OK', 'requestBody arg should be set');
      t.end();
    });

  http.request('http://localhost/', function () {}).end('OK');
});

test('delay works with replyWithFile', function (t) {
  checkDuration(t, 100);
  nock('http://localhost')
    .get('/')
    .delay(100)
    .replyWithFile(200, __dirname + '/../assets/reply_file_1.txt');

  http.request('http://localhost/', function (res) {
    res.setEncoding('utf8');

    var body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.once('end', function() {
      t.equal(body, 'Hello from the file!', 'the body should eql the text from the file');
      t.end();
    });
  }).end('OK');
});

test('delay works with when you return a generic stream from the reply callback', function (t) {
  checkDuration(t, 100);
  nock('http://localhost')
    .get('/')
    .delay(100)
    .reply(200, function (path, reqBody) {
      return fs.createReadStream(__dirname + '/../assets/reply_file_1.txt');
    });

  http.request('http://localhost/', function (res) {
    res.setEncoding('utf8');

    var body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.once('end', function() {
      t.equal(body, 'Hello from the file!', 'the body should eql the text from the file');
      t.end();
    });
  }).end('OK');
});

test("finish event fired before end event (bug-139)", function(t) {
	var scope = nock('http://www.filterboddiezregexp.com')
		.filteringRequestBody(/mia/, 'nostra')
		.post('/', 'mamma nostra')
		.reply(200, "Hello World!");

	var finishCalled = false;
	var req = http.request({
													 host: "www.filterboddiezregexp.com"
													 , method: 'POST'
													 , path: '/'
													 , port: 80
												 }, function(res) {
		t.equal(finishCalled, true);
		t.equal(res.statusCode, 200);
		res.on('end', function() {
			scope.done();
			t.end();
		});
		// Streams start in 'paused' mode and must be started.
		// See https://nodejs.org/api/stream.html#stream_class_stream_readable
		res.resume();
	});

	req.on('finish', function() {
		finishCalled = true;
	});

	req.end('mamma mia');

});

if (stream.Readable) {
  test('when a stream is used for the response body, it will not be read until after the response event', function (t) {
    var responseEvent = false;
    var text = 'Hello World\n';

    function SimpleStream(opt) {
      stream.Readable.call(this, opt);
    }
    util.inherits(SimpleStream, stream.Readable);
    SimpleStream.prototype._read = function() {
      t.ok(responseEvent);
      this.push(text);
      this.push(null);
    };

    nock('http://localhost')
      .get('/')
      .reply(200, function (path, reqBody) {
        return new SimpleStream();
      });

    http.get('http://localhost/', function (res) {
      responseEvent = true;
      res.setEncoding('utf8');

      var body = '';

      res.on('data', function(chunk) {
        body += chunk;
      });

      res.once('end', function() {
        t.equal(body, text);
        t.end();
      });
    });
  });
}

test('calling delayConnection delays the connection', function (t) {
  checkDuration(t, 100);

  nock('http://funk')
    .get('/')
    .delayConnection(100)
    .reply(200, 'OK');

  http.get('http://funk/', function (res) {
    res.setEncoding('utf8');

    var body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.once('end', function() {
      t.equal(body, 'OK');
      t.end();
    });
  });
});

test('using reply callback with delayConnection provides proper arguments', function (t) {
  nock('http://localhost')
    .get('/')
    .delayConnection(100)
    .reply(200, function (path, requestBody) {
      t.equal(path, '/', 'path arg should be set');
      t.equal(requestBody, 'OK', 'requestBody arg should be set');
      t.end();
    });

  http.request('http://localhost/', function () {}).end('OK');
});

test('delayConnection works with replyWithFile', function (t) {
  checkDuration(t, 100);
  nock('http://localhost')
    .get('/')
    .delayConnection(100)
    .replyWithFile(200, __dirname + '/../assets/reply_file_1.txt');

  http.request('http://localhost/', function (res) {
    res.setEncoding('utf8');

    var body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.once('end', function() {
      t.equal(body, 'Hello from the file!', 'the body should eql the text from the file');
      t.end();
    });
  }).end('OK');
});

test('delayConnection works with when you return a generic stream from the reply callback', function (t) {
  checkDuration(t, 100);
  nock('http://localhost')
    .get('/')
    .delayConnection(100)
    .reply(200, function (path, reqBody) {
      return fs.createReadStream(__dirname + '/../assets/reply_file_1.txt');
    });

  var req = http.request('http://localhost/', function (res) {
    res.setEncoding('utf8');

    var body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.once('end', function() {
      t.equal(body, 'Hello from the file!', 'the body should eql the text from the file');
      t.end();
    });
  }).end('OK');
});

test('define() is backward compatible', function(t) {
  var nockDef = {
    "scope":"http://example.com",
    //  "port" has been deprecated
    "port":12345,
    "method":"GET",
    "path":"/",
    //  "reply" has been deprected
    "reply":"500"
  };

  var nocks = nock.define([nockDef]);

  t.ok(nocks);

  var req = new http.request({
    host: 'example.com',
    port: nockDef.port,
    method: nockDef.method,
    path: nockDef.path
  }, function(res) {
    t.equal(res.statusCode, 500);

    res.once('end', function() {
      t.end();
    });
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();
  });

  req.on('error', function(err) {
    console.error(err);
    //  This should never happen.
    t.ok(false, 'Error should never occur.');
    t.end();
  });

  req.end();

});

test('define() works with non-JSON responses', function(t) {
  var nockDef = {
    "scope":"http://example.com",
    "method":"POST",
    "path":"/",
    "body":"�",
    "status":200,
    "response":"�"
  };

  var nocks = nock.define([nockDef]);

  t.ok(nocks);

  var req = new http.request({
    host: 'example.com',
    method: nockDef.method,
    path: nockDef.path
  }, function(res) {
    t.equal(res.statusCode, nockDef.status);

    var dataChunks = [];

    res.on('data', function(chunk) {
      dataChunks.push(chunk);
    });

    res.once('end', function() {
      var response = Buffer.concat(dataChunks);
      t.equal(response.toString('utf8'), nockDef.response, 'responses match');
      t.end();
    });
  });

  req.on('error', function(err) {
    console.error(err);
    //  This should never happen.
    t.ok(false, 'Error should never occur.');
    t.end();
  });

  req.write(nockDef.body);
  req.end();

});

test('define() works with binary buffers', function(t) {
  var nockDef = {
    "scope":"http://example.com",
    "method":"POST",
    "path":"/",
    "body":"8001",
    "status":200,
    "response":"8001"
  };

  var nocks = nock.define([nockDef]);

  t.ok(nocks);

  var req = new http.request({
    host: 'example.com',
    method: nockDef.method,
    path: nockDef.path
  }, function(res) {
    t.equal(res.statusCode, nockDef.status);

    var dataChunks = [];

    res.on('data', function(chunk) {
      dataChunks.push(chunk);
    });

    res.once('end', function() {
      var response = Buffer.concat(dataChunks);
      t.equal(response.toString('hex'), nockDef.response, 'responses match');
      t.end();
    });
  });

  req.on('error', function(err) {
    console.error(err);
    //  This should never happen.
    t.ok(false, 'Error should never occur.');
    t.end();
  });

  req.write(new Buffer(nockDef.body, 'hex'));
  req.end();

});

test('issue #163 - Authorization header isn\'t mocked', function(t) {
  function makeRequest(cb) {
    var r = http.request(
      {
        hostname: 'www.example.com',
        path: '/',
        method: 'GET',
        auth: 'foo:bar'
      },
      function(res) {
        cb(res.req._headers);
      }
    );
    r.end();
  }

  makeRequest(function(headers) {
    var n = nock('http://www.example.com', {
      reqheaders: { 'authorization': 'Basic Zm9vOmJhcg==' }
    }).get('/').reply(200);

    makeRequest(function(nockHeader) {
      n.done();
      t.equivalent(headers, nockHeader);
      t.end();
    });
  });
});

test('define() uses reqheaders', function(t) {
  var nockDef = {
    "scope":"http://example.com",
    "method":"GET",
    "path":"/",
    "status":200,
    "reqheaders": {
      host: 'example.com',
      'authorization': 'Basic Zm9vOmJhcg=='
    }
  };

  var nocks = nock.define([nockDef]);

  t.ok(nocks);

  var req = new http.request({
    host: 'example.com',
    method: nockDef.method,
    path: nockDef.path,
    auth: 'foo:bar'
  }, function(res) {
    t.equal(res.statusCode, nockDef.status);

    res.once('end', function() {
      t.equivalent(res.req._headers, nockDef.reqheaders);
      t.end();
    });
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();
  });
  req.end();

});

test('sending binary and receiving JSON should work ', function(t) {
  var scope = nock('http://example.com')
    .filteringRequestBody(/.*/, '*')
    .post('/some/path', '*')
    .reply(201, { foo: '61' }, {
      'Content-Type': 'application/json'
    });

  mikealRequest({
    method: 'POST',
    uri: 'http://example.com/some/path',
    body: new Buffer('ffd8ffe000104a46494600010101006000600000ff', 'hex'),
    headers: { 'Accept': 'application/json', 'Content-Length': 23861 }
  }, function(err, res, body) {
      scope.done();

      t.equal(res.statusCode, 201);
      t.equal(body.length, 12);

      var json;
      try {
        json = JSON.parse(body);
      } catch (e) {
        json = {};
      }

      t.equal(json.foo, '61');
      t.end();
    }
  );
});

test('fix #146 - resume() is automatically invoked when the response is drained', function(t) {
  var replyLength = 1024 * 1024;
  var replyBuffer = new Buffer((new Array(replyLength + 1)).join("."));
  t.equal(replyBuffer.length, replyLength);

  nock("http://www.abc.com")
    .get("/abc")
    .reply(200, replyBuffer);

  needle.get("http://www.abc.com/abc", function(err, res, buffer) {
    t.notOk(err);
    t.ok(res);
    t.ok(buffer);
    t.equal(buffer, replyBuffer);
    t.end();
  });
});

test("handles get with restify client", function(t) {
  var scope =
  nock("https://www.example.com").
    get("/get").
    reply(200, 'get');

  var client = restify.createClient({
    url: 'https://www.example.com'
  })

  client.get('/get', function(err, req, res) {
    req.on('result', function(err, res) {
      res.body = '';
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        res.body += chunk;
      });

      res.on('end', function() {
        t.equal(res.body, 'get')
        t.end();
        scope.done();
      });
    });
  });
});

test("handles post with restify client", function(t) {
  var scope =
  nock("https://www.example.com").
    post("/post", 'hello world').
    reply(200, 'post');

  var client = restify.createClient({
    url: 'https://www.example.com'
  })

  client.post('/post', function(err, req, res) {
    req.on('result', function(err, res) {
      res.body = '';
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        res.body += chunk;
      });

      res.on('end', function() {
        t.equal(res.body, 'post')
        t.end();
        scope.done();
      });
    });

    req.write('hello world');
    req.end();
  });
});

test("handles get with restify JsonClient", function(t) {
  var scope =
  nock("https://www.example.com").
    get("/get").
    reply(200, {get: 'ok'});

  var client = restify.createJsonClient({
    url: 'https://www.example.com'
  })

  client.get('/get', function(err, req, res, obj) {
    t.equal(obj.get, 'ok');
    t.end();
    scope.done();
  });
});

test("handles post with restify JsonClient", function(t) {
  var scope =
  nock("https://www.example.com").
    post("/post", {username: 'banana'}).
    reply(200, {post: 'ok'});

  var client = restify.createJsonClient({
    url: 'https://www.example.com'
  })

  client.post('/post', {username: 'banana'}, function(err, req, res, obj) {
    t.equal(obj.post, 'ok');
    t.end();
    scope.done();
  });
});

test("handles 404 with restify JsonClient", function(t) {
  var scope =
  nock("https://www.example.com").
    put("/404").
    reply(404);

  var client = restify.createJsonClient({
    url: 'https://www.example.com'
  })

  client.put('/404', function(err, req, res, obj) {
    t.equal(res.statusCode, 404);
    t.end();
    scope.done();
  });
});

test("handles 500 with restify JsonClient", function(t) {
  var scope =
  nock("https://www.example.com").
    delete("/500").
    reply(500);

  var client = restify.createJsonClient({
    url: 'https://www.example.com'
  })

  client.del('/500', function(err, req, res, obj) {
    t.equal(res.statusCode, 500);
    t.end();
    scope.done();
  });
});

test('test request timeout option', function(t) {

  nock('http://example.com')
    .get('/test')
    .reply(200, JSON.stringify({ foo: 'bar' }));

  var options = {
    url: 'http://example.com/test',
    method: 'GET',
    timeout: 2000
  };

  mikealRequest(options, function(err, res, body) {
    t.strictEqual(err, null);
    t.equal(body, '{"foo":"bar"}');
    t.end();
  });
});


test('done fails when specified request header is missing', function(t) {
  var scope = nock('http://example.com', {
    reqheaders: {
      "X-App-Token": "apptoken",
      "X-Auth-Token": "apptoken"
    }
  })
  .post('/resource')
  .reply(200, { status: "ok" });

  var d = domain.create();

  d.run(function() {
    mikealRequest({
      method: 'POST',
      uri: 'http://example.com/resource',
      headers: {
        "X-App-Token": "apptoken"
      }
    });
  });

  d.once('error', function(err) {
    t.ok(err.message.match(/No match/));
    t.end();
  });
});

test('done does not fail when specified request header is not missing', function(t) {
  var scope = nock('http://example.com', {
    reqheaders: {
      "X-App-Token": "apptoken",
      "X-Auth-Token": "apptoken"
    }
  })
  .post('/resource')
  .reply(200, { status: "ok" });

  mikealRequest({
    method: 'POST',
    uri: 'http://example.com/resource',
    headers: {
      "X-App-Token": "apptoken",
      "X-Auth-Token": "apptoken"
    }
  }, function(err, res, body) {
    t.type(err, 'null');
    t.equal(res.statusCode, 200);
    t.end();
  });

});

test('done fails when specified bad request header is present', function (t) {
  var scope = nock('http://example.com', {
    badheaders: ['cookie']
  })
  .post('/resource')
  .reply(200, { status: 'ok' });

  var d = domain.create();

  d.run(function() {
    mikealRequest({
      method: 'POST',
      uri: 'http://example.com/resource',
      headers: {
        'Cookie': 'cookie'
      }
    });
  });

  d.once('error', function (err) {
    t.ok(err.message.match(/No match/));
    t.end();
  });
});

test('mikeal/request with delayConnection and request.timeout', function(t) {
  var endpoint = nock("http://some-server.com")
    .post("/")
    .delayConnection(1000)
    .reply(200, {});

  mikealRequest.post({
      url: "http://some-server.com/",
      timeout: 10
    },
    function (err) {
      t.type(err, 'Error');
      t.equal(err && err.code, "ETIMEDOUT");
      t.end();
  });
});

test("get correct filtering with scope and request headers filtering", function(t) {
  var responseText = 'OK!';
  var responseHeaders = { 'Content-Type': 'text/plain'};
  var requestHeaders = { host: 'a.subdomain.of.google.com' };

  var scope = nock('http://a.subdomain.of.google.com', {
      filteringScope: function(scope) {
        return (/^http:\/\/.*\.google\.com/).test(scope);
      }
    })
    .get('/somepath')
    .reply(200, responseText, responseHeaders);

  var dataCalled = false;
  var host = 'some.other.subdomain.of.google.com';
  var req = http.get({
    host: host,
    method: 'GET',
    path: '/somepath',
    port: 80
  }, function(res) {
    res.on('data', function(data) {
      dataCalled = true;
      t.equal(data.toString(), responseText);
    });
    res.on('end', function() {
      t.true(dataCalled);
      scope.done();
      t.end();
    });
  });

  t.equivalent(req._headers, { host: requestHeaders.host });

});

test('mocking succeeds even when mocked and specified request header names have different cases', function(t) {
  var scope = nock('http://example.com', {
    reqheaders: {
      "x-app-token": "apptoken",
      "x-auth-token": "apptoken"
    }
  })
    .post('/resource')
    .reply(200, { status: "ok" });

  mikealRequest({
    method: 'POST',
    uri: 'http://example.com/resource',
    headers: {
      "X-App-TOKEN": "apptoken",
      "X-Auth-TOKEN": "apptoken"
    }
  }, function(err, res, body) {
    t.type(err, 'null');
    t.equal(res.statusCode, 200);
    t.end();
  });

});

test('mocking succeeds even when host request header is not specified', function(t) {
  var scope = nock('http://example.com')
    .post('/resource')
    .reply(200, { status: "ok" });

  mikealRequest({
    method: 'POST',
    uri: 'http://example.com/resource',
    headers: {
      "X-App-TOKEN": "apptoken",
      "X-Auth-TOKEN": "apptoken"
    }
  }, function(err, res, body) {
    t.type(err, 'null');
    t.equal(res.statusCode, 200);
    t.end();
  });

});

test('mikeal/request with strictSSL: true', function(t) {
  var scope = nock('https://strictssl.com')
    .post('/what')
    .reply(200, { status: "ok" });

  mikealRequest({
    method: 'POST',
    uri: 'https://strictssl.com/what',
    strictSSL: true
  }, function(err, res, body) {
    t.type(err, 'null');
    t.equal(res && res.statusCode, 200);
    t.end();
  });

});

test('response readable pull stream works as expected', function(t) {
  var scope = nock('http://streamingalltheway.com')
    .get('/ssstream')
    .reply(200, "this is the response body yeah");

  var req = http.request({
        host: "streamingalltheway.com"
      , path: '/ssstream'
      , port: 80
    }, function(res) {

      var responseBody = '';
      t.equal(res.statusCode, 200);
      res.on('readable', function() {
        var chunk;
        while (null !== (chunk = res.read())) {
          responseBody += chunk.toString();
        }
        if (chunk === null) {
          t.equal(responseBody, "this is the response body yeah");
          t.end();
        }
      });
    });

  req.end();
});

test(".setNoDelay", function(t) {
  var dataCalled = false

  var scope = nock('http://nodelayyy.com')
    .get('/yay')
    .reply(200, "Hi");

  var req = http.request({
      host: "nodelayyy.com"
    , path: '/yay'
    , port: 80
  }, function(res) {

    t.equal(res.statusCode, 200);
    res.on('end', t.end.bind(t));
    // Streams start in 'paused' mode and must be started.
    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
    res.resume();

  });

  req.setNoDelay(true);

  req.end();
});

test("match basic authentication header", function(t) {
  var username = 'testuser'
    , password = 'testpassword'
    , authString = username + ":" + password
    , encrypted = (new Buffer(authString)).toString( 'base64' );

  var scope = nock('http://www.headdy.com')
     .get('/')
     .matchHeader('Authorization', function(val) {
       var expected = 'Basic ' + encrypted;
       return val == expected;
     })
     .reply(200, "Hello World!");

  http.get({
     host: "www.headdy.com"
    , path: '/'
    , port: 80
    , auth: authString
  }, function(res) {
    res.setEncoding('utf8');
    t.equal(res.statusCode, 200);

    res.on('data', function(data) {
      t.equal(data, 'Hello World!');
    });

    res.on('end', function() {
      scope.done();
      t.end();
    });
  });

});

test('request emits socket', function(t) {
  var scope = nock('http://gotzsocketz.com')
     .get('/')
     .reply(200, "hey");

  var req = http.get('http://gotzsocketz.com');
  req.once('socket', function(socket) {
    t.type(socket, Object);
    t.type(socket.getPeerCertificate(), 'string');
    t.end();
  });
});

test('socket emits connect and secureConnect', function(t) {
  t.plan(3);

  var scope = nock('http://gotzsocketz.com')
     .post('/')
     .reply(200, "hey");

  var req = http.request({
      host: "gotzsocketz.com"
    , path: '/'
    , method: 'POST'
  });

  req.on('socket', function(socket) {
    socket.once('connect', function() {
      req.end();
      t.ok(true);
    });
    socket.once('secureConnect', function() {
      t.ok(true);
    });
  });

  req.once('response', function(res) {
    res.setEncoding('utf8');
    res.on('data', function(d) {
      t.equal(d, 'hey');
    });
  });
});

test('socket setKeepAlive', function(t) {
  var scope = nock('http://setkeepalive.com')
     .get('/')
     .reply(200, "hey");

  var req = http.get('http://setkeepalive.com');
  req.once('socket', function(socket) {
    socket.setKeepAlive(true);
    t.end();
  });
});

test('hyperquest works', function(t) {
  nock('http://hyperquest.com')
    .get('/somepath')
    .reply(200, 'Yay hyperquest!');

  var req = hyperquest('http://hyperquest.com/somepath');
  var reply = '';
  req.on('data', function(d) {
    reply += d;
  });
  req.once('end', function() {
    t.equals(reply, 'Yay hyperquest!');
    t.end();
  });
});

test('remove interceptor for GET resource', function(t) {
  var scope = nock('http://example.org')
    .get('/somepath')
    .reply(200, 'hey');

  var mocks = scope.pendingMocks();
  t.deepEqual(mocks, ['GET http://example.org:80/somepath']);

  var result = nock.removeInterceptor({
    hostname : 'example.org',
    path : '/somepath'
  });
  t.ok(result, 'result should be true');

  nock('http://example.org')
    .get('/somepath')
    .reply(202, 'other-content');

  http.get({
    host: 'example.org',
    path : '/somepath'
  }, function(res) {
    res.setEncoding('utf8');
    t.equal(res.statusCode, 202);

    res.on('data', function(data) {
      t.equal(data, 'other-content');
    });

    res.on('end', function() {
      t.end();
    });
  });
});

test('remove interceptor for not found resource', function(t) {
  var result = nock.removeInterceptor({
    hostname : 'example.org',
    path : '/somepath'
  });
  t.notOk(result, 'result should be false as no interceptor was found');
  t.end();
});

test('isDone() must consider repeated responses', function(t) {

  var scope = nock('http://www.example.com')
    .get('/')
    .times(2)
    .reply(204);

  function makeRequest(callback) {
    var req = http.request({
      host: "www.example.com",
      path: '/',
      port: 80
    }, function(res) {
      t.equal(res.statusCode, 204);
      res.on('end', callback);
      // Streams start in 'paused' mode and must be started.
      // See https://nodejs.org/api/stream.html#stream_class_stream_readable
      res.resume();
    });
    req.end();
  }

  t.notOk(scope.isDone(), "should not be done before all requests");
  makeRequest(function() {
    t.notOk(scope.isDone(), "should not yet be done after the first request");
    makeRequest(function() {
      t.ok(scope.isDone(), "should be done after the two requests are made");
      scope.done();
      t.end();
    });
  });

});

test('you must setup an interceptor for each request', function(t) {
  var scope = nock('http://www.example.com')
     .get('/hey')
     .reply(200, 'First match');

  mikealRequest.get('http://www.example.com/hey', function(error, res, body) {
    t.equal(res.statusCode, 200);
    t.equal(body, 'First match', 'should match first request response body');

    mikealRequest.get('http://www.example.com/hey', function(error, res, body) {
      t.equal(error && error.toString(), 'Error: Nock: No match for request GET http://www.example.com/hey ');
      scope.done();
      t.end();
    });
  });
});

test('calling socketDelay will emit a timeout', function (t) {
    nock('http://www.example.com')
        .get('/')
        .socketDelay(10000)
        .reply(200, 'OK');

    var req = http.request('http://www.example.com', function (res) {
        res.setEncoding('utf8');

        var body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.once('end', function() {
            t.fail('socket did not timeout when idle');
            t.end();
        });
    });

    req.setTimeout(5000, function () {
        t.ok(true);
        t.end();
    });

    req.end();
});

test('calling socketDelay not emit a timeout if not idle for long enough', function (t) {
    nock('http://www.example.com')
        .get('/')
        .socketDelay(10000)
        .reply(200, 'OK');

    var req = http.request('http://www.example.com', function (res) {
        res.setEncoding('utf8');

        var body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.once('end', function() {
            t.equal(body, 'OK');
            t.end();
        });
    });

    req.setTimeout(60000, function () {
        t.fail('socket timed out unexpectedly');
        t.end();
    });

    req.end();
});

test("replyWithError returns an error on request", function(t) {
    var scope = nock('http://www.google.com')
        .post('/echo')
        .replyWithError('Service not found');

    var req = http.request({
        host: "www.google.com"
        , method: 'POST'
        , path: '/echo'
        , port: 80
    });

    // An error should have have been raised
    req.on('error', function(e) {
      scope.done();
      t.equal(e.message, 'Service not found');
      t.end();
    });

    req.end();
});

test("replyWithError allows json response", function(t) {
    var scope = nock('http://www.google.com')
        .post('/echo')
        .replyWithError({message: "Service not found", code: 'test'});

    var req = http.request({
        host: "www.google.com"
        , method: 'POST'
        , path: '/echo'
        , port: 80
    });

    // An error should have have been raised
    req.on('error', function(e) {
      scope.done();
      t.equal(e.message, 'Service not found');
      t.equal(e.code, 'test');
      t.end();
    });

    req.end();
});

test('no content type provided', function(t) {
  var scope = nock('http://nocontenttype.com')
    .replyContentLength()
    .post('/httppost', function() {
      return true
    })
    .reply(401, "");

  var req = http.request({
      host: "nocontenttype.com",
      path: '/httppost',
      method: 'POST',
      headers: {}
  }, function(res) {
    console.log('haz response');
    res.on('data', function() {});
    res.once('end', function() {
      console.log('response ended');
      scope.done();
      t.ok(true);
      t.end();
    });
  }).end('WHAA');

});

test('query() matches a query string of the same name=value', function (t) {
  var scope = nock('http://google.com')
    .get('/')
    .query({foo:'bar'})
    .reply(200);

  mikealRequest('http://google.com/?foo=bar', function(err, res) {
    if (err) throw err;
    t.equal(res.statusCode, 200);
    t.end();
  })
});

test('query() matches multiple query strings of the same name=value', function (t) {
  var scope = nock('http://google.com')
    .get('/')
    .query({foo:'bar',baz:'foz'})
    .reply(200);

  mikealRequest('http://google.com/?foo=bar&baz=foz', function(err, res) {
    if (err) throw err;
    t.equal(res.statusCode, 200);
    t.end();
  })
});

test('query() matches multiple query strings of the same name=value regardless of order', function (t) {
  var scope = nock('http://google.com')
    .get('/')
    .query({foo:'bar',baz:'foz'})
    .reply(200);

  mikealRequest('http://google.com/?baz=foz&foo=bar', function(err, res) {
    if (err) throw err;
    t.equal(res.statusCode, 200);
    t.end();
  })
});

test('query() matches query values regardless of their type of declaration', function (t) {
  var scope = nock('http://google.com')
    .get('/')
    .query({num:1,bool:true,empty:null,str:'fou'})
    .reply(200);

  mikealRequest('http://google.com/?num=1&bool=true&empty=&str=fou', function(err, res) {
    if (err) throw err;
    t.equal(res.statusCode, 200);
    t.end();
  })
});

test('query() matches a query string using regexp', function (t) {
  var scope = nock('http://google.com')
    .get('/')
    .query({foo:/.*/})
    .reply(200);

  mikealRequest('http://google.com/?foo=bar', function(err, res) {
    if (err) throw err;
    t.equal(res.statusCode, 200);
    t.end();
  })
});

test('query() matches a query string that is url encoded', function (t) {
  var scope = nock('http://google.com')
    .get('/')
    .query({'foo&bar':'hello&world'})
    .reply(200);

  var options = {
    uri: 'http://google.com/',
    qs: {
      'foo&bar': 'hello&world'
    }
  };

  mikealRequest(options, function(err, res) {
    if (err) throw err;
    t.equal(res.statusCode, 200);
    t.end();
  })
});

test('query() with "true" will allow all query strings to pass', function (t) {
  var scope = nock('http://google.com')
    .get('/')
    .query(true)
    .reply(200);

  mikealRequest('http://google.com/?foo=bar&a=1&b=2', function(err, res) {
    if (err) throw err;
    t.equal(res.statusCode, 200);
    t.end();
  })
});

test('query() will not match when there is no query string in the request', function (t) {
  var scope = nock('https://d.com')
    .get('/a')
    .query({foo:'bar'})
    .reply(200);

  mikealRequest('https://d.com/a', function(err, res) {
    t.equal(err.message.trim(), 'Nock: No match for request GET https://d.com/a');
    t.end();
  })
});

test('query() will not match when a query string does not match name=value', function (t) {
  var scope = nock('https://c.com')
    .get('/b')
    .query({foo:'bar'})
    .reply(200);

  mikealRequest('https://c.com/b?foo=baz', function(err, res) {
    t.equal(err.message.trim(), 'Nock: No match for request GET https://c.com/b?foo=baz');
    t.end();
  })
});

test('query() will not match when a query string is present that was not registered', function (t) {
  var scope = nock('https://b.com')
    .get('/c')
    .query({foo:'bar'})
    .reply(200);

  mikealRequest('https://b.com/c?foo=bar&baz=foz', function(err, res) {
    t.equal(err.message.trim(), 'Nock: No match for request GET https://b.com/c?foo=bar&baz=foz');
    t.end();
  })
});

test('query() will not match when a query string is malformed', function (t) {
  var scope = nock('https://a.com')
    .get('/d')
    .query({foo:'bar'})
    .reply(200);

  mikealRequest('https://a.com/d?foobar', function(err, res) {
    t.equal(err.message.trim(), 'Nock: No match for request GET https://a.com/d?foobar');
    t.end();
  })
});


test("teardown", function(t) {
  var leaks = Object.keys(global)
    .splice(globalCount, Number.MAX_VALUE);

  if (leaks.length == 1 && leaks[0] == '_key') {
    leaks = [];
  }
  t.deepEqual(leaks, [], 'No leaks');
  t.end();
});
