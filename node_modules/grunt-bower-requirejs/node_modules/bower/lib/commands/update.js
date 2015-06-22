var Project = require('../core/Project');
var cli = require('../util/cli');
var defaultConfig = require('../config');

function update(logger, names, options, config) {
    var project;

    options = options || {};
    config = defaultConfig(config);
    project = new Project(config, logger);

    // If names is an empty array, null them
    if (names && !names.length) {
        names = null;
    }

    return project.update(names, options);
}

// -------------------

update.line = function (logger, argv) {
    var options = update.options(argv);
    var names = options.argv.remain.slice(1);
    return update(logger, names, options);
};

update.options = function (argv) {
    return cli.readOptions({
        'force-latest': { type: Boolean, shorthand: 'F' },
        'production': { type: Boolean, shorthand: 'p' }
    }, argv);
};

update.completion = function () {
    // TODO:
};

module.exports = update;
