var Q = require('q');
var path = require('path');
var fs = require('graceful-fs');
var cli = require('../util/cli');
var createError = require('../util/createError');

function help(logger, name) {
    var json;

    if (name) {
        json = path.resolve(__dirname, '../../templates/json/help-' + name.replace(/\s+/g, '/') + '.json');
    } else {
        json = path.resolve(__dirname, '../../templates/json/help.json');
    }

    return Q.promise(function (resolve) {
        fs.exists(json, resolve);
    })
    .then(function (exists) {
        if (!exists) {
            throw createError('Unknown command: ' + name, 'EUNKOWNCMD', {
                command: name
            });
        }

        return require(json);
    });
}

// -------------------

help.line = function (logger, argv) {
    var options = cli.readOptions(argv);
    var name = options.argv.remain.slice(1).join(' ');
    return help(logger, name);
};

help.completion = function () {
    // TODO
};

module.exports = help;
