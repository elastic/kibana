var Q = require('q');
var RegistryClient = require('bower-registry-client');
var cli = require('../util/cli');
var defaultConfig = require('../config');

function lookup(logger, name, config) {
    var registryClient;

    config = defaultConfig(config);
    config.cache = config.storage.registry;

    registryClient = new RegistryClient(config, logger);

    return Q.nfcall(registryClient.lookup.bind(registryClient), name)
    .then(function (entry) {
        // TODO: Handle entry.type.. for now it's only 'alias'
        //       When we got published packages, this needs to be adjusted
        return !entry ? null : {
            name: name,
            url: entry && entry.url
        };
    });
}

// -------------------

lookup.line = function (logger, argv) {
    var options =  cli.readOptions(argv);
    var name = options.argv.remain[1];

    if (!name) {
        return new Q();
    } else {
        return lookup(logger, name);
    }
};

lookup.completion = function () {
    // TODO:
};

module.exports = lookup;
