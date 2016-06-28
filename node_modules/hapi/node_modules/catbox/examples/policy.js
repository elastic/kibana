// After starting this example load http://localhost:8080 and hit refresh, you will notice that it loads the response from cache for the first 5 seconds and then reloads the cache.  Look at the console to see it setting and getting items from cache.

// Load modules

var Catbox = require('../');
var Http = require('http');



// Declare internals

var internals = {};


internals.handler = function (req, res) {

    internals.getResponse(function (item) {

        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end(item);
    });
};


internals.getResponse = function (callback) {

    internals.policy.get('myExample', callback);
};


internals.startCache = function (callback) {

    var clientOptions = {
        partition: 'examples'               // For redis this will store items under keys that start with examples:
    };

    var policyOptions = {
        expiresIn: 5000,
        generateFunc: function (id, next) {

            var item = 'example';
            console.log(item);
            return next(null, item);
        }
    };

    var client = new Catbox.Client(require('../test/import'), clientOptions);
    client.start(function () {

        internals.policy = new Catbox.Policy(policyOptions, client, 'example');
        callback();
    });
};


internals.startServer = function () {

    var server = Http.createServer(internals.handler);
    server.listen(8080);
    console.log('Server started at http://localhost:8080/');
};


internals.startCache(internals.startServer);
