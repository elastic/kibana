var Project = require('../core/Project');
var open = require('opn');
var endpointParser = require('bower-endpoint-parser');
var cli = require('../util/cli');
var createError = require('../util/createError');
var defaultConfig = require('../config');

function home(logger, name, config) {
    var project;
    var promise;
    var decEndpoint;

    config = defaultConfig(config);
    project = new Project(config, logger);

    // Get the package meta
    // If no name is specified, read the project json
    // If a name is specified, fetch from the package repository
    if (!name) {
        promise = project.hasJson()
        .then(function (json) {
            if (!json) {
                throw createError('You are not inside a package', 'ENOENT');
            }

            return project.getJson();
        });
    } else {
        decEndpoint = endpointParser.decompose(name);
        promise = project.getPackageRepository().fetch(decEndpoint)
        .spread(function (canonicalDir, pkgMeta) {
            return pkgMeta;
        });
    }

    // Get homepage and open it
    return promise.then(function (pkgMeta) {
        var homepage = pkgMeta.homepage;

        if (!homepage) {
            throw createError('No homepage set for ' + pkgMeta.name, 'ENOHOME');
        }

        open(homepage);
        return homepage;
    });
}

// -------------------

home.line = function (logger, argv) {
    var options = cli.readOptions(argv);
    var name = options.argv.remain[1];

    return home(logger, name);
};

home.completion = function () {
    // TODO:
};

module.exports = home;
