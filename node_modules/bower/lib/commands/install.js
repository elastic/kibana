var endpointParser = require('bower-endpoint-parser');
var Project = require('../core/Project');
var cli = require('../util/cli');
var Tracker = require('../util/analytics').Tracker;
var defaultConfig = require('../config');

function install(logger, endpoints, options, config) {
    var project;
    var decEndpoints;
    var tracker;

    options = options || {};
    config = defaultConfig(config);
    if (options.save === undefined) {
        options.save = config.defaultSave;
    }
    project = new Project(config, logger);
    tracker = new Tracker(config);

    // Convert endpoints to decomposed endpoints
    endpoints = endpoints || [];
    decEndpoints = endpoints.map(function (endpoint) {
        return endpointParser.decompose(endpoint);
    });
    tracker.trackDecomposedEndpoints('install', decEndpoints);

    return project.install(decEndpoints, options, config);
}

// -------------------

install.line = function (logger, argv) {
    var options = install.options(argv);
    return install(logger, options.argv.remain.slice(1), options);
};

install.options = function (argv) {
    return cli.readOptions({
        'force-latest': { type: Boolean, shorthand: 'F'},
        'production': { type: Boolean, shorthand: 'p' },
        'save': { type: Boolean, shorthand: 'S' },
        'save-dev': { type: Boolean, shorthand: 'D' }
    }, argv);
};

install.completion = function () {
    // TODO:
};

module.exports = install;
