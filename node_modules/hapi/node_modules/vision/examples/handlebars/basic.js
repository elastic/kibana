// Load modules

var Hapi = require('hapi');


// Declare internals

var internals = {};


var handler = function (request, reply) {

    reply.view('basic/index', {
        title: 'examples/views/handlebars/basic.js | Hapi ' + Hapi.version,
        message: 'Hello World!'
    });
};


internals.main = function () {

    var server = new Hapi.Server();
    server.connection({ port: 8000 });

    server.views({
        engines: { html: require('handlebars') },
        path: __dirname + '/templates'
    });

    server.route({ method: 'GET', path: '/', handler: handler });
    server.start();
};


internals.main();
