/*
Copyright (c) 2013, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

var nopt = require('nopt'),
    chalk = require('chalk'),
    known = {
        json: Boolean,
        csv: Boolean,
        markdown: Boolean,
        out: require('path'),
        unknown: Boolean,
        version: Boolean,
        color: Boolean,
        start: String,
        help: Boolean
    },
    shorts = {
        "v" : ["--version"],
        "h" : ["--help"]
    };

var raw = function (args) {
    return nopt(known, shorts, (args || process.argv));
};

var has = function (a) {
    var cooked = raw().argv.cooked,
        ret = false;

    cooked.forEach(function (o) {
        if ((o === '--' + a) || (o === '--no-' + a)) {
            ret = true;
        }
    });

    return ret;
};

var clean = function(args) {
    var parsed = raw(args);
    delete parsed.argv;
    return parsed;
};

var setDefaults = function(parsed) {
    if (parsed === undefined) {
        parsed = clean();
    }
    if (parsed.color === undefined) {
        parsed.color = chalk.supportsColor;
    }
    parsed.start = parsed.start || process.cwd();

    return parsed;
};

var parse = function (args) {
    var parsed = clean(args);
    return setDefaults(parsed);
};

exports.defaults = setDefaults;
exports.has = has;
exports.raw = raw;
exports.parse = parse;
exports.shorts = shorts;
exports.known = known;
