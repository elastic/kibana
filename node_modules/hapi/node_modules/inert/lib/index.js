// Load modules

var Directory = require('./directory');
var File = require('./file');


// Declare internals

var internals = {};


exports.register = function (server, options, next) {

    server.expose('_etags', server.settings.files.etagsCacheMaxSize ? new File.Etags(server.settings.files.etagsCacheMaxSize) : null);

    server.handler('file', File.handler);
    server.handler('directory', Directory.handler);

    server.decorate('reply', 'file', function (path, responseOptions) {

        return this.response(File.response(path, responseOptions, this.request));
    });

    return next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};
