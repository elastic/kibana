
/*
Copyright (c) 2013, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

var UNKNOWN = 'UNKNOWN';
var fs = require('fs');
var path = require('path');
var read = require('read-installed');
var chalk = require('chalk');
var treeify = require('treeify');
var license = require('./license');

var flatten = function(options) {
    var moduleInfo = { licenses: UNKNOWN },
        json = options.deps,
        data = options.data,
        key = json.name + '@' + json.version,
        colorize = options.color,
        licenseData, files = [], licenseFile;

    if (colorize) {
        moduleInfo = { licenses: chalk.bold.red(UNKNOWN) };
        key = chalk.blue(json.name) + chalk.dim('@') + chalk.green(json.version);
    }

    // If we have processed this key already, just return the data object.
    // This was added so that we don't recurse forever if there was a circular
    // dependency in the dependency tree.
    if (data[key]) {
        return data;
    }

    data[key] = moduleInfo;

    if (json.repository) {
        if (typeof json.repository === 'object' && typeof json.repository.url === 'string') {
            moduleInfo.repository = json.repository.url.replace('git+ssh://git@', 'git://').replace('.git', '');
            moduleInfo.repository = moduleInfo.repository.replace('git://github.com', 'https://github.com').replace('.git', '');
            moduleInfo.repository = moduleInfo.repository.replace('git@github.com:', 'https://github.com/').replace('.git', '');
        }
    }
    if (json.url) {
        if (typeof json.url === 'object') {
            moduleInfo.url = json.url.web;
        }
    }

    licenseData = json.license || json.licenses || undefined;
    if (licenseData) {
        if (Array.isArray(licenseData) && licenseData.length > 0) {
            moduleInfo.licenses = licenseData.map(function(license){
                if (typeof license === 'object') {
                    return license.type;
                } else if (typeof license === 'string') {
                    return license;
                }
            });
        } else if (typeof licenseData === 'object' && licenseData.type) {
            moduleInfo.licenses = licenseData.type;
        } else if (typeof licenseData === 'string') {
            moduleInfo.licenses = licenseData;
        }
    } else if (license(json.readme)) {
        moduleInfo.licenses = license(json.readme);
    }

    if (json.path && fs.existsSync(json.path)) {
        files = fs.readdirSync(json.path).filter(function(filename) {
            filename = filename.toUpperCase();
            return filename.indexOf('LICENSE') > -1 || filename.indexOf('LICENCE') > -1 ;
        });
    }

    files.forEach(function(filename) {
        licenseFile = path.join(json.path, filename);
        // Checking that the file is in fact a normal file and not a directory for example.
        if (fs.lstatSync(licenseFile).isFile()) {
            if (!moduleInfo.licenses || moduleInfo.licenses.indexOf(UNKNOWN) > -1) {
                //Only re-check the license if we didn't get it from elsewhere
                moduleInfo.licenses = license(fs.readFileSync(licenseFile, {encoding: 'utf8'}));
            }
            moduleInfo.licenseFile = licenseFile;
        }
    });

    if (Array.isArray(moduleInfo.licenses)) {
        if (moduleInfo.licenses.length === 1) {
            moduleInfo.licenses = moduleInfo.licenses[0];
        }
    }

    if (json.dependencies) {
        Object.keys(json.dependencies).forEach(function(name) {
            var childDependency = json.dependencies[name],
                dependencyId = childDependency.name + '@' + childDependency.version;
            if (options.filter && options.filter(name, childDependency)) {
                return;
            }
            if (data[dependencyId]) { // already exists
                return;
            }
            data = flatten({
                deps: childDependency,
                data: data,
                color: colorize,
                filter: options.filter
            });
        });
    }
    return data;
};

exports.init = function(options, callback) {
    console.error('scanning' , options.start);
    read(options.start, { dev: true }, function(err, json) {
        var data = flatten({
                deps: json,
                data: {},
                color: options.color,
                filter: options.filter
            }),
            colorize = options.color,
            sorted = {};
        Object.keys(data).sort().forEach(function(item) {
            if (options.unknown) {
                if (data[item].licenses && data[item].licenses !== UNKNOWN) {
                    if (data[item].licenses.indexOf('*') > -1) {
                        if (colorize) {
                            data[item].licenses = chalk.bold.red(UNKNOWN);
                        } else {
                            data[item].licenses = UNKNOWN;
                        }
                    }
                }
            }
            if (data[item]) {
                sorted[item] = data[item];
            }
        });
        callback(sorted);
    });
};

exports.print = function(sorted) {
    console.log(exports.asTree(sorted));
};

exports.asTree = function(sorted) {
    return treeify.asTree(sorted, true);
};

exports.asCSV = function(sorted) {
    var text = [['"module name"','"license"','"repository"'].join(',')];
    Object.keys(sorted).forEach(function(key) {
        var module = sorted[key],
            line = [
                '"' + key + '"',
                '"' + (module.licenses || '') + '"',
                '"' + (module.repository || '') + '"'
            ].join(',');
            text.push(line);
    });

    return text.join('\n');
};

exports.asMarkDown = function(sorted) {
    var text = [];
    Object.keys(sorted).forEach(function(key) {
        var module = sorted[key];
        text.push('[' + key + '](' + module.repository + ') - ' + module.licenses);
    });
    return text.join('\n');
};
