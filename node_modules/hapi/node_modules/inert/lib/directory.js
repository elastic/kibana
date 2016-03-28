// Load modules

var Fs = require('fs');
var Path = require('path');
var Boom = require('boom');
var Hoek = require('hoek');
var Items = require('items');
var Joi = require('joi');
var File = require('./file');


// Declare internals

var internals = {};


internals.schema = Joi.object({
    path: Joi.alternatives(Joi.array().items(Joi.string()).single(), Joi.func()).required(),
    index: Joi.alternatives(Joi.boolean(), Joi.array().items(Joi.string()).single()).default(true),
    listing: Joi.boolean(),
    showHidden: Joi.boolean(),
    redirectToSlash: Joi.boolean(),
    lookupCompressed: Joi.boolean(),
    defaultExtension: Joi.string().alphanum()
});


exports.handler = function (route, options) {

    Joi.assert(options, internals.schema, 'Invalid directory handler options (' + route.path + ')');
    Hoek.assert(route.path[route.path.length - 1] === '}', 'The route path must end with a parameter:', route.path);

    var settings = Joi.validate(options, internals.schema).value;

    var normalize = function (paths) {

        var normalized = [];
        for (var i = 0, il = paths.length; i < il; ++i) {
            var path = paths[i];

            if (!Hoek.isAbsolutePath(path)) {
                path = Path.join(route.settings.files.relativeTo, path);
            }

            normalized.push(path);
        }

        return normalized;
    };

    var normalized = (Array.isArray(settings.path) ? normalize(settings.path) : []);            // Array or function

    var indexNames = (settings.index === true) ? ['index.html'] : (settings.index || []);

    // Declare handler

    var handler = function (request, reply) {

        var paths = normalized;
        if (typeof settings.path === 'function') {
            var result = settings.path.call(null, request);
            if (result instanceof Error) {
                return reply(result);
            }

            if (Array.isArray(result)) {
                paths = normalize(result);
            }
            else if (typeof result === 'string') {
                paths = normalize([result]);
            }
            else {
                return reply(Boom.badImplementation('Invalid path function'));
            }
        }

        // Append parameter

        var selection = null;
        var lastParam = request.paramsArray[request.paramsArray.length - 1];
        if (lastParam) {
            if (lastParam.indexOf('..') !== -1) {
                return reply(Boom.forbidden());
            }

            selection = lastParam;
        }

        if (selection &&
            !settings.showHidden &&
            internals.isFileHidden(selection)) {

            return reply(Boom.notFound());
        }

        // Generate response

        var resource = request.path;
        var hasTrailingSlash = (resource[resource.length - 1] === '/');

        Items.serial(paths, function (path, nextPath) {

            path = Path.join(path, selection || '');

            File.load(path, request, { lookupCompressed: settings.lookupCompressed }, function (response) {

                // File loaded successfully

                if (!response.isBoom) {
                    return reply(response);
                }

                // Not found

                var err = response;
                if (err.output.statusCode === 404) {
                    if (!settings.defaultExtension) {
                        return nextPath();
                    }

                    if (hasTrailingSlash) {
                        path = path.slice(0, -1);
                    }

                    return File.load(path + '.' + settings.defaultExtension, request, { lookupCompressed: settings.lookupCompressed }, function (extResponse) {

                        if (!extResponse.isBoom) {
                            return reply(extResponse);
                        }

                        return nextPath();
                    });
                }

                // Propagate non-directory errors

                if (err.output.statusCode !== 403 || err.data !== 'EISDIR') {
                    return reply(err);
                }

                // Directory

                if (indexNames.length === 0 &&
                    !settings.listing) {

                    return reply(Boom.forbidden());
                }

                if (settings.redirectToSlash !== false &&                       // Defaults to true
                    !request.connection.settings.router.stripTrailingSlash &&
                    !hasTrailingSlash) {

                    return reply.redirect(resource + '/');
                }

                Items.serial(indexNames, function (indexName, nextIndex) {

                    var indexFile = Path.join(path, indexName);
                    File.load(indexFile, request, { lookupCompressed: settings.lookupCompressed }, function (indexResponse) {

                        // File loaded successfully

                        if (!indexResponse.isBoom) {
                            return reply(indexResponse);
                        }

                        // Directory

                        var err = indexResponse;
                        if (err.output.statusCode !== 404) {
                            return reply(Boom.badImplementation(indexName + ' is a directory'));
                        }

                        // Not found, try the next one

                        return nextIndex();
                    });
                },
                function (/* err */) {

                    // None of the index files were found

                    if (!settings.listing) {
                        return reply(Boom.forbidden());
                    }

                    return internals.generateListing(path, resource, selection, hasTrailingSlash, settings, request, reply);
                });
            });
        },
        function (/* err */) {

            return reply(Boom.notFound());
        });
    };

    return handler;
};


internals.generateListing = function (path, resource, selection, hasTrailingSlash, settings, request, reply) {

    Fs.readdir(path, function (err, files) {

        if (err) {
            return reply(Boom.internal('Error accessing directory', err));
        }

        resource = decodeURIComponent(resource);
        var display = Hoek.escapeHtml(resource);
        var html = '<html><head><title>' + display + '</title></head><body><h1>Directory: ' + display + '</h1><ul>';

        if (selection) {
            var parent = resource.substring(0, resource.lastIndexOf('/', resource.length - (hasTrailingSlash ? 2 : 1))) + '/';
            html += '<li><a href="' + internals.pathEncode(parent) + '">Parent Directory</a></li>';
        }

        for (var i = 0, il = files.length; i < il; ++i) {
            if (settings.showHidden ||
                !internals.isFileHidden(files[i])) {

                html += '<li><a href="' + internals.pathEncode(resource + (selection && !hasTrailingSlash ? '/' : '') + files[i]) + '">' + Hoek.escapeHtml(files[i]) + '</a></li>';
            }
        }

        html += '</ul></body></html>';

        return reply(request.generateResponse(html));
    });
};


internals.isFileHidden = function (path) {

    return /(^|[\\\/])\.([^\\\/]|[\\\/]?$)/.test(path);           // Starts with a '.' or contains '/.' or '\.', and not followed by a '/' or '\' or end
};


internals.pathEncode = function (path) {

    return encodeURIComponent(path).replace(/%2F/g, '/').replace(/%5C/g, '\\');
};
