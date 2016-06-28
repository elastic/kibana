// Load modules

var Hapi = require('hapi');


// Declare internals

var internals = {};


var handler = function (request, reply) {

    reply.view('withPartials/index', {
        title: 'examples/views/handlebars/partials.js | Hapi ' + Hapi.version,
        message: 'Hello World!\n'
    });
};


internals.main = function () {

    var server = new Hapi.Server();
    server.connection({ port: 8000 });

    server.views({
        engines: { html: require('handlebars') },
        path: __dirname + '/templates',
        partialsPath: __dirname + '/templates/withPartials'
    });

    server.route({ method: 'GET', path: '/', handler: handler });
    server.start();
};


internals.main();
