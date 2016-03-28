// Load modules

var Hapi = require('hapi');


// Declare internals

var internals = {};


var rootHandler = function (request, reply) {

    reply.view('index', {
        title: 'examples/views/jade/index.js | Hapi ' + Hapi.version,
        message: 'Index - Hello World!'
    });
};

var aboutHandler = function (request, reply) {

    reply.view('about', {
        title: 'examples/views/jade/index.js | Hapi ' + Hapi.version,
        message: 'About - Hello World!'
    });
};


internals.main = function () {

    var server = new Hapi.Server();
    server.connection({ port: 8000 });

    server.views({
        engines: { jade: require('jade') },
        path: __dirname + '/templates',
        compileOptions: {
            pretty: true
        }
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });
    server.route({ method: 'GET', path: '/about', handler: aboutHandler });
    server.start();
};


internals.main();
