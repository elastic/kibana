var semver = require('semver');
var which = require('which');
var fs = require('fs');
var path = require('path');
var Q = require('q');
var execFile = require('child_process').execFile;
var Project = require('../core/Project');
var cli = require('../util/cli');
var defaultConfig = require('../config');
var createError = require('../util/createError');

function version(logger, versionArg, options, config) {
    var project;

    config = defaultConfig(config);
    project = new Project(config, logger);

    return bump(project, versionArg, options.message);
}

function bump(project, versionArg, message) {
    var newVersion;
    var doGitCommit = false;

    return checkGit()
    .then(function (hasGit) {
        doGitCommit = hasGit;
    })
    .then(project.getJson.bind(project))
    .then(function (json) {
        newVersion = getNewVersion(json.version, versionArg);
        json.version = newVersion;
    })
    .then(project.saveJson.bind(project))
    .then(function () {
        if (doGitCommit) {
            return gitCommitAndTag(newVersion, message);
        }
    })
    .then(function () {
        console.log('v' + newVersion);
    });
}

function getNewVersion(currentVersion, versionArg) {
    var newVersion = semver.valid(versionArg);
    if (!newVersion) {
        newVersion = semver.inc(currentVersion, versionArg);
    }
    if (!newVersion) {
        throw createError('Invalid version argument: `' + versionArg + '`. Usage: `bower version [<newversion> | major | minor | patch]`', 'EINVALIDVERSION');
    }
    if (currentVersion === newVersion) {
        throw createError('Version not changed', 'EVERSIONNOTCHANGED');
    }
    return newVersion;
}

function checkGit() {
    var gitDir = path.join(process.cwd(), '.git');
    return Q.nfcall(fs.stat, gitDir)
    .then(function (stat) {
        if (stat.isDirectory()) {
            return checkGitStatus();
        }
        return false;
    }, function () {
        //Ignore not found .git directory
        return false;
    });
}

function checkGitStatus() {
    return Q.nfcall(which, 'git')
    .fail(function (err) {
        err.code = 'ENOGIT';
        throw err;
    })
    .then(function () {
        return Q.nfcall(execFile, 'git', ['status', '--porcelain'], {env: process.env});
    })
    .then(function (value) {
        var stdout = value[0];
        var lines = filterModifiedStatusLines(stdout);
        if (lines.length) {
            throw createError('Git working directory not clean.\n' + lines.join('\n'), 'EWORKINGDIRECTORYDIRTY');
        }
        return true;
    });
}

function filterModifiedStatusLines(stdout) {
    return stdout.trim().split('\n')
    .filter(function (line) {
        return line.trim() && !line.match(/^\?\? /);
    }).map(function (line) {
        return line.trim();
    });
}

function gitCommitAndTag(newVersion, message) {
    var tag = 'v' + newVersion;
    message = message || tag;
    message = message.replace(/%s/g, newVersion);
    return Q.nfcall(execFile, 'git', ['add', 'bower.json'], {env: process.env})
    .then(function () {
        return Q.nfcall(execFile, 'git', ['commit', '-m', message], {env: process.env});
    })
    .then(function () {
        return Q.nfcall(execFile, 'git', ['tag', tag, '-am', message], {env: process.env});
    });
}

// -------------------

version.line = function (logger, argv) {
    var options = version.options(argv);
    return version(logger, options.argv.remain[1], options);
};

version.options = function (argv) {
    return cli.readOptions({
        'message': { type: String, shorthand: 'm'}
    }, argv);
};

version.completion = function () {
    // TODO:
};

module.exports = version;
