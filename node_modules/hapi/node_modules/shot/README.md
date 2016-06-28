![shot Logo](https://raw.github.com/hapijs/shot/master/images/shot.png)

Injects a fake HTTP request/response into a node HTTP server for simulating server logic, writing tests, or debugging. Does not use a socket
connection so can be run against an inactive server (server not in listen mode).

[![Build Status](https://secure.travis-ci.org/hapijs/shot.png)](http://travis-ci.org/hapijs/shot)

Lead Maintainer: [Eran Hammer](https://github.com/hueniverse)

For example:

```javascript
// Load modules

var Http = require('http');
var Shot = require('shot');


// Declare internals

var internals = {};


internals.main = function () {

    var dispatch = function (req, res) {

        var reply = 'Hello World';
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': reply.length });
        res.end(reply);
    };

    var server = Http.createServer(dispatch);

    Shot.inject(dispatch, { method: 'get', url: '/' }, function (res) {

        console.log(res.payload);
    });
};


internals.main();
```

Note how `server.listen` is never called.
