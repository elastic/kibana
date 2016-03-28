// Load modules

var Path = require('path');
var Hapi = require('hapi');
var Pages = require('./pages');


// Declare internals

var internals = {};


var view = function (viewName) {

    return function (request, reply) {

        return reply.view(viewName, { title: viewName });
    };
};


var getPages = function (request, reply) {

    return reply.view('index', { pages: Object.keys(Pages.getAll()), title: 'All pages' });
};


var getPage = function (request, reply) {

    return reply.view('page', { page: Pages.getPage(request.params.page), title: request.params.page });
};


var createPage = function (request, reply) {

    Pages.savePage(request.payload.name, request.payload.contents);
    return reply.view('page', { page: Pages.getPage(request.payload.name), title: 'Create page' });
};


var showEditForm = function (request, reply) {

    return reply.view('edit', { page: Pages.getPage(request.params.page), title: 'Edit: ' + request.params.page });
};


var updatePage = function (request, reply) {

    Pages.savePage(request.params.page, request.payload.contents);
    return reply.view('page', { page: Pages.getPage(request.params.page), title: request.params.page });
};


internals.main = function () {

    var server = new Hapi.Server();
    server.connection({ port: 8000, state: { ignoreErrors: true } });

    server.views({
        engines: { html: require('handlebars') },
        path: Path.join(__dirname, 'views'),
        layout: true,
        partialsPath: Path.join(__dirname, 'views', 'partials')
    });

    server.route({ method: 'GET', path: '/', handler: getPages });
    server.route({ method: 'GET', path: '/pages/{page}', handler: getPage });
    server.route({ method: 'GET', path: '/create', handler: view('create') });
    server.route({ method: 'POST', path: '/create', handler: createPage });
    server.route({ method: 'GET', path: '/pages/{page}/edit', handler: showEditForm });
    server.route({ method: 'POST', path: '/pages/{page}/edit', handler: updatePage });
    server.start();
};


internals.main();
