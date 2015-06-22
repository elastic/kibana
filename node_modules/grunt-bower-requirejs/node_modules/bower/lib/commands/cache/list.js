var mout = require('mout');
var PackageRepository = require('../../core/PackageRepository');
var cli = require('../../util/cli');
var defaultConfig = require('../../config');

function list(logger, packages, options, config) {
    var repository;

    config = defaultConfig(config);
    repository = new PackageRepository(config, logger);

    // If packages is an empty array, null them
    if (packages && !packages.length) {
        packages = null;
    }

    return repository.list()
    .then(function (entries) {
        if (packages) {
            // Filter entries according to the specified packages
            entries = entries.filter(function (entry) {
                return !!mout.array.find(packages, function (pkg) {
                    return pkg === entry.pkgMeta.name;
                });
            });
        }

        return entries;
    });
}

// -------------------

list.line = function (logger, argv) {
    var options = cli.readOptions(argv);
    var packages = options.argv.remain.slice(2);
    return list(logger, packages, options);
};

list.completion = function () {
    // TODO:
};

module.exports = list;
