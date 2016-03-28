// Load modules

var Hapi = require('hapi');


// Declare internals

var internals = {};

var ctx = {
    title: 'examples/views/mixed | Hapi ' + Hapi.version,
    message: 'Hello World!'
};


var oneHandler = function (request, reply) {

    reply.view('index.jade', ctx);
};

var twoHandler = function (request, reply) {

    reply.view('handlebars.html', ctx);
};


internals.main = function () {

    var server = new Hapi.Server();
    server.connection({ port: 8000 });

    server.views({
        engines: {
            'html': require('handlebars'),
            'jade': require('jade')
        },
        path: __dirname + '/templates'
    });

    server.route({ method: 'GET', path: '/one', handler: oneHandler });
    server.route({ method: 'GET', path: '/two', handler: twoHandler });
    server.start();
};


internals.main();
