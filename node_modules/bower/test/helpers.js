var Q = require('q');
var path = require('path');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var uuid = require('node-uuid');
var object = require('mout/object');
var fs = require('fs');
var glob = require('glob');
var os = require('os');
var cmd = require('../lib/util/cmd');
var config = require('../lib/config');

// Those are needed for Travis or not configured git environment
var env = {
    'GIT_AUTHOR_DATE': 'Sun Apr 7 22:13:13 2013 +0000',
    'GIT_AUTHOR_NAME': 'André Cruz',
    'GIT_AUTHOR_EMAIL': 'amdfcruz@gmail.com',
    'GIT_COMMITTER_DATE': 'Sun Apr 7 22:13:13 2013 +0000',
    'GIT_COMMITTER_NAME': 'André Cruz',
    'GIT_COMMITTER_EMAIL': 'amdfcruz@gmail.com'
};

// Preserve the original environment
object.mixIn(env, process.env);

var tmpLocation = path.join(
    os.tmpdir ? os.tmpdir() : os.tmpDir(),
    'bower-tests',
    uuid.v4().slice(0, 8)
);

exports.require = function (name) {
    return require(path.join(__dirname, '../', name));
};

// We need to reset cache because tests are reusing temp directories
beforeEach(function () {
    config.reset();
});

after(function () {
    rimraf.sync(tmpLocation);
});

exports.TempDir = (function() {
    function TempDir (defaults) {
        this.path = path.join(tmpLocation, uuid.v4());
        this.defaults = defaults;
    }

    TempDir.prototype.create = function (files) {
        var that = this;

        files = object.merge(files || {}, this.defaults);

        if (files) {
            object.forOwn(files, function (contents, filepath) {
                if (typeof contents === 'object') {
                    contents = JSON.stringify(contents, null, ' ') + '\n';
                }

                var fullPath = path.join(that.path, filepath);
                mkdirp.sync(path.dirname(fullPath));
                fs.writeFileSync(fullPath, contents);
            });
        }

        return this;
    };

    TempDir.prototype.prepare = function (files) {
        rimraf.sync(this.path);
        mkdirp.sync(this.path);
        this.create(files);

        return this;
    };

    // TODO: Rewrite to synchronous form
    TempDir.prototype.prepareGit = function (revisions) {
        var that = this;

        revisions = object.merge(revisions || {}, this.defaults);

        rimraf.sync(that.path);

        mkdirp.sync(that.path);

        var promise = new Q();

        object.forOwn(revisions, function (files, tag) {
            promise = promise.then(function () {
                return that.git('init');
            }).then(function () {
                that.glob('./!(.git)').map(function (removePath) {
                    var fullPath = path.join(that.path, removePath);

                    rimraf.sync(fullPath);
                });

                that.create(files);
            }).then(function () {
                return that.git('add', '-A');
            }).then(function () {
                return that.git('commit', '-m"commit"');
            }).then(function () {
                return that.git('tag', tag);
            });
        });

        return promise;
    };

    TempDir.prototype.glob = function (pattern) {
        return glob.sync(pattern, {
            cwd: this.path,
            dot: true
        });
    };

    TempDir.prototype.read = function (name) {
        return fs.readFileSync(path.join(this.path, name), 'utf8');
    };

    TempDir.prototype.git = function () {
        var args = Array.prototype.slice.call(arguments);

        return cmd('git', args, { cwd: this.path, env: env });
    };

    TempDir.prototype.exists = function (name) {
        return fs.existsSync(path.join(this.path, name));
    };

    return TempDir;
})();

exports.expectEvent = function (emitter, eventName) {
    var deferred = Q.defer();

    emitter.once(eventName, function () {
        deferred.resolve(arguments);
    });

    return deferred.promise;
};
