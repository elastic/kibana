(function () {

    /**
     * Git handling for node. All public functions can be chained and all `then` handlers are optional.
     *
     * @param {String} baseDir base directory for all processes to run
     *
     * @param {Function} ChildProcess The ChildProcess constructor to use
     * @param {Function} Buffer The Buffer implementation to use
     *
     * @constructor
     */
    function Git (baseDir, ChildProcess, Buffer) {
        this._baseDir = baseDir;
        this._runCache = [];

        this.ChildProcess = ChildProcess;
        this.Buffer = Buffer;
    }

    /**
     * @type {string} The command to use to reference the git binary
     */
    Git.prototype._command = 'git';

    /**
     * @type {Function} An optional handler to use when a child process is created
     */
    Git.prototype._outputHandler = null;

    /**
     * @type {boolean} Property showing whether logging will be silenced - defaults to true in a production environment
     */
    Git.prototype._silentLogging = /prod/.test(process.env.NODE_ENV);

    /**
     * Sets the path to a custom git binary, should either be `git` when there is an installation of git available on
     * the system path, or a fully qualified path to the executable.
     *
     * @param {string} command
     * @returns {Git}
     */
    Git.prototype.customBinary = function (command) {
        this._command = command;
        return this;
    };

    /**
     * Sets a handler function to be called whenever a new child process is created, the handler function will be called
     * with the name of the command being run and the stdout & stderr streams used by the ChildProcess.
     *
     * @example
     * require('simple-git')
     *    .outputHandler(function (command, stdout, stderr) {
    *       stdout.pipe(process.stdout);
    *    })
     *    .checkout('https://github.com/user/repo.git');
     *
     * @see http://nodejs.org/api/child_process.html#child_process_class_childprocess
     * @see http://nodejs.org/api/stream.html#stream_class_stream_readable
     * @param {Function} outputHandler
     * @returns {Git}
     */
    Git.prototype.outputHandler = function (outputHandler) {
        this._outputHandler = outputHandler;
        return this;
    };

    /**
     * Initialize a git repo
     *
     * @param {Function} [then]
     */
    Git.prototype.init = function (then) {
        return this._run(['init'], function (err) {
            then && then(err);
        });
    };

    /**
     * Check the status of the local repo
     *
     * @param {Function} [then]
     */
    Git.prototype.status = function (then) {
        return this._run(['status', '--porcelain'], function (err, data) {
            then && then(err, !err && this._parseStatus(data));
        });
    };

    /**
     * Clone a git repo
     *
     * @param {String} repoPath
     * @param {String} localPath
     * @param {Function} [then]
     */
    Git.prototype.clone = function (repoPath, localPath, then) {
        return this._run(['clone', repoPath, localPath], function (err) {
            then && then(err);
        });
    };

    /**
     * Internally uses pull and tags to get the list of tags then checks out the latest tag.
     *
     * @param {Function} [then]
     */
    Git.prototype.checkoutLatestTag = function (then) {
        var git = this;
        return this.pull().tags(function (err, tags) {
            git.checkout(tags.latest, then);
        });
    };

    /**
     * Adds one or more files to source control
     *
     * @param {String|String[]} files
     * @param {Function} [then]
     */
    Git.prototype.add = function (files, then) {
        return this._run(['add'].concat(files), function (err, data) {
            then && then(err);
        });
    };

    /**
     * Commits changes in the current working directory - when specific file paths are supplied, only changes on those
     * files will be committed.
     *
     * @param {String} message
     * @param {String|String[]} [files]
     * @param {Function} [then]
     */
    Git.prototype.commit = function (message, files, then) {
        var git = this;
        if (!then && typeof files === "function") {
            then = files;
            files = [];
        }

        return this._run(['commit', '-m', message].concat([].concat(files || [])), function (err, data) {
            then && then(err, !err && git._parseCommit(data));
        });
    };

    /**
     * Gets a function to be used for logging.
     *
     * @param {string} level
     * @param {string} [message]
     *
     * @returns {Function}
     * @private
     */
    Git.prototype._getLog = function (level, message) {
        var log = this._silentLogging ? function () {} : console[level].bind(console);
        if (arguments.length > 1) {
            log(message);
        }
        return log;
    };

    /**
     * Pull the updated contents of the current repo
     * @param {String} [remote]
     * @param {String} [branch]
     * @param {Function} [then]
     */
    Git.prototype.pull = function (remote, branch, then) {
        var command = ["pull"];
        if (typeof remote === 'string' && typeof branch === 'string') {
            command.push(remote, branch);
        }
        if (typeof arguments[arguments.length - 1] === 'function') {
            then = arguments[arguments.length - 1];
        }

        return this._run(command, function (err, data) {
            then && then(err, !err && this._parsePull(data));
        });
    };

    /**
     * Fetch the updated contents of the current repo.
     *
     * @example
     *   .fetch('upstream', 'master') // fetches from master on remote named upstream
     *   .fetch(function () {}) // runs fetch against default remote and branch and calls function
     *
     * @param {String} [remote]
     * @param {String} [branch]
     * @param {Function} [then]
     */
    Git.prototype.fetch = function (remote, branch, then) {
        var command = ["fetch"];
        if (typeof remote === 'string' && typeof branch === 'string') {
            command.push(remote, branch);
        }
        if (typeof arguments[arguments.length - 1] === 'function') {
            then = arguments[arguments.length - 1];
        }

        return this._run(command, function (err, data) {
            then && then(err, !err && this._parseFetch(data));
        });
    };

    /**
     * Disables/enables the use of the console for printing warnings and errors, by default messages are not shown in
     * a production environment.
     *
     * @param {boolean} silence
     * @returns {Git}
     */
    Git.prototype.silent = function (silence) {
        this._silentLogging = !!silence;
        return this;
    };

    /**
     * List all tags
     *
     * @param {Function} [then]
     */
    Git.prototype.tags = function (then) {
        return this._run(['tag', '-l'], function (err, data) {
            then && then(err, !err && this._parseListTags(data));
        });
    };

    /**
     * Add a lightweight tag to the head of the current branch
     *
     * @param {String} name
     * @param {Function} [then]
     */
    Git.prototype.addTag = function (name, then) {
        return this._run(['tag', name], function (err) {
            then && then(err);
        });
    };

    /**
     * Check out a tag or revision
     *
     * @param {String} what
     * @param {Function} [then]
     */
    Git.prototype.checkout = function (what, then) {
        return this._run(['checkout', what], function (err, data) {
            then && then(err, !err && this._parseCheckout(data));
        });
    };

    /**
     * Check out a remote branch
     *
     * @param {String} branchName name of branch
     * @param {String} startPoint (e.g origin/development)
     * @param {Function} [then]
     */
    Git.prototype.checkoutBranch = function (branchName, startPoint, then) {
        return this._run(['checkout', '-b', branchName, startPoint], function (err, data) {
            then && then(err, !err && this._parseCheckout(data));
        });
    };

    /**
     * Check out a local branch
     *
     * @param {String} branchName of branch
     * @param {Function} [then]
     */
    Git.prototype.checkoutLocalBranch = function (branchName, then) {
        return this._run(['checkout', '-b', branchName], function (err, data) {
            then && then(err, !err && this._parseCheckout(data));
        });
    };

    /**
     * Add a submodule
     *
     * @param {String} repo
     * @param {String} path
     * @param {Function} [then]
     */
    Git.prototype.submoduleAdd = function (repo, path, then) {
        return this._run(['submodule', 'add', repo, path], function (err) {
            then && then(err);
        });
    };

    /**
     * List remote
     *
     * @param {String[]} [args]
     * @param {Function} [then]
     */
    Git.prototype.listRemote = function (args, then) {
        if (!then && typeof args === "function") {
            then = args;
            args = [];
        }

        if (typeof args === 'string') {
            this._getLog('warn', 'Git#listRemote: args should be supplied as an array of individual arguments');
        }

        return this._run(['ls-remote'].concat(args), function (err, data) {
            then && then(err, data);
        });
    };

    /**
     * Adds a remote to the list of remotes.
     *
     * @param {String} remoteName Name of the repository - eg "upstream"
     * @param {String} remoteRepo Fully qualified SSH or HTTP(S) path to the remote repo
     * @param {Function} [then]
     * @returns {*}
     */
    Git.prototype.addRemote = function (remoteName, remoteRepo, then) {
        return this._run(['remote', 'add', remoteName, remoteRepo], function (err) {
            then && then(err);
        });
    };

    /**
     * Removes an entry from the list of remotes.
     *
     * @param {String} remoteName Name of the repository - eg "upstream"
     * @param {Function} [then]
     * @returns {*}
     */
    Git.prototype.removeRemote = function (remoteName, then) {
        return this._run(['remote', 'remove', remoteName], function (err) {
            then && then(err);
        });
    };

    /**
     * Pushes the current committed changes to a remote, optionally specify the names of the remote and branch to use
     * when pushing.
     *
     * @param {String} [remote]
     * @param {String} [branch]
     * @param {Function} [then]
     */
    Git.prototype.push = function (remote, branch, then) {
        var command = ["push"];
        if (typeof remote === 'string' && typeof branch === 'string') {
            command.push(remote, branch);
        }
        if (typeof arguments[arguments.length - 1] === 'function') {
            then = arguments[arguments.length - 1];
        }

        return this._run(command, function (err, data) {
            then && then(err, !err && data);
        });
    };

    /**
     * Pushes the current tag changes to a remote which can be either a URL or named remote. When not specified uses the
     * default configured remote spec.
     *
     * @param {String} [remote]
     * @param {Function} [then]
     */
    Git.prototype.pushTags = function (remote, then) {
        var command = ['push'];
        if (typeof remote === "string") {
            command.push(remote);
        }
        command.push('--tags');

        then = typeof arguments[arguments.length - 1] === "function" ? arguments[arguments.length - 1] : null;

        return this._run(command, function (err, data) {
            then && then(err, !err && data);
        });
    };

    /**
     * Removes the named files from source control.
     *
     * @param {String|String[]} files
     * @param {Function} [then]
     */
    Git.prototype.rm = function (files, then) {
        return this._rm(files, '-f', then);
    };

    /**
     * Removes the named files from source control but keeps them on disk rather than deleting them entirely. To
     * completely remove the files, use `rm`.
     *
     * @param {String|String[]} files
     * @param {Function} [then]
     */
    Git.prototype.rmKeepLocal = function (files, then) {
        return this._rm(files, '--cached', then);
    };

    /**
     * Return repository changes.
     *
     * @param {String} [options]
     * @param {Function} [then]
     */
    Git.prototype.diff = function (options, then) {
        var command = ['diff'];

        if (typeof options === 'string') {
            command[0] += ' ' + options;
            this._getLog('warn',
                'Git#diff: supplying options as a single string is now deprecated, switch to an array of strings');
        }
        else if (Array.isArray(options)) {
            command.push.apply(command, options);
        }

        if (typeof arguments[arguments.length - 1] === 'function') {
            then = arguments[arguments.length - 1];
        }

        return this._run(command, function (err, data) {
            then && then(err, data);
        });
    };

    /**
     * rev-parse.
     *
     * @param {String|String[]} [options]
     * @param {Function} [then]
     */
    Git.prototype.revparse = function(options, then) {
        var command = ['rev-parse'];

        if (typeof options === 'string') {
            command = command + ' ' + options;
            this._getLog('warn',
                'Git#revparse: supplying options as a single string is now deprecated, switch to an array of strings');
        }
        else if (Array.isArray(options)) {
            command.push.apply(command, options);
        }

        if (typeof arguments[arguments.length - 1] === 'function') {
            then = arguments[arguments.length - 1];
        }

        return this._run(command, function(err, data) {
            then && then(err, data);
        });
    };

    /**
     * Show various types of objects, for example the file at a certain commit
     *
     * @param {String} [options]
     * @param {Function} [then]
     */
    Git.prototype.show = function(options, then) {
        var args = [].slice.call(arguments, 0);
        var handler = typeof args[args.length - 1] === "function" ? args.pop() : null;
        var command = ['show'];
        if (typeof args[0] === "string") {
            command.push(args[0])
        }

        return this._run(command, function(err, data) {
            handler && handler(err, !err && data);
        });
    };

    /**
     * Call a simple function
     * @param {Function} [then]
     */
    Git.prototype.then = function (then) {
        this._run([], function () {
            typeof then === 'function' && then();
        });
        return this;
    };

    /**
     * Show commit logs.
     *
     * @param {Object} [options]
     * @param {string} [options.from] The first commit to include
     * @param {string} [options.to] The most recent commit to include
     * @param {string} [options.file] A single file to include in the result
     *
     * @param {Function} [then]
     */
    Git.prototype.log = function (options, then) {
        var command = ["log", "--pretty=format:'%H;%ai;%s%d;%aN;%ae'"];
        var opt = {};

        var args = [].slice.call(arguments, 0);
        var handler = typeof args[args.length - 1] === "function" ? args.pop() : null;

        if (!args.length) {
            opt = {};
        }
        else if (typeof args[0] === "object") {
            opt = args[0];
        }
        else if (typeof args[0] === "string" || typeof args[1] === "string") {
            this._getLog('warn',
                'Git#log: supplying to or from as strings is now deprecated, switch to an options configuration object');
            opt = {
                from: args[0],
                to: args[1]
            };
        }

        if (opt.from && opt.to) {
            command.push(opt.from + "..." + opt.to);
        }

        if (opt.file) {
            command.push("--follow", options.file);
        }

        return this._run(command, function (err, data) {
            handler && handler(err, !err && this._parseListLog(data));
        });
    };

    Git.prototype._rm = function (files, options, then) {
        return this._run(['rm', options, [].concat(files)], function (err) {
            then && then(err);
        });
    };

    Git.prototype._parsePull = function (pull) {
        var changes = {
            files: [],
            insertions: {},
            deletions: {},
            summary: {
                changes: 0,
                insertions: 0,
                deletions: 0
            }
        };

        var fileUpdateRegex = /^\s*(.+)\s\|\s(\d+)\s([\+]+)/;
        for (var lines = pull.split('\n'), i = 0, l = lines.length; i < l; i++) {
            var update = fileUpdateRegex.exec(lines[i]);

            // search for update statement for each file
            if (update) {
                changes.files.push(update[1]);

                var insertions = update[3].length;
                if (insertions) {
                    changes.insertions[update[1]] = insertions;
                }
                if (update[2] > insertions) {
                    changes.deletions[update[1]] = update[2] - insertions;
                }
            }

            // summary appears after updates
            else if (changes.files.length && (update = /(\d+)\D+(\d+)\D+(\d+)/.exec(lines[i]))) {
                changes.summary.changes = +update[1];
                changes.summary.insertions = +update[2];
                changes.summary.deletions = +update[3];
            }
        }

        return changes;
    };

    Git.prototype._parseListTags = function (tags) {
        var tagList = tags.split('\n').sort(function (tagA, tagB) {
            var partsA = tagA.split('.');
            var partsB = tagB.split('.');

            for (var i = 0, l = Math.max(partsA.length, partsB.length); i < l; i++) {
                var diff = partsA[i] - partsB[i];
                if (diff) {
                    return diff > 0 ? 1 : -1;
                }
            }

            return 0;
        });

        return {
            latest: tagList.length && tagList[tagList.length - 1],
            all: tagList
        };
    };

    Git.prototype._parseStatus = function (status) {
        var line;
        var lines = status.trim().split('\n');

        var not_added = [];
        var deleted = [];
        var modified = [];
        var created = [];

        var whitespace = /\s+/;

        while (line = lines.shift()) {
            line = line.trim().split(whitespace);

            switch (line.shift()) {
                case "??":
                    not_added.push(line.join());
                    break;
                case "D":
                    deleted.push(line.join());
                    break;
                case "M":
                    modified.push(line.join());
                    break;
                case "A":
                case "AM":
                    created.push(line.join());
                    break;
            }
        }

        return {
            not_added: not_added,
            deleted: deleted,
            modified: modified,
            created: created
        };
    };

    Git.prototype._parseCommit = function (commit) {
        var lines = commit.trim().split('\n');
        var branch = /\[([^\s]+) ([^\]]+)/.exec(lines.shift());
        var summary = /(\d+)[^,]*(?:,\s*(\d+)[^,]*)?(?:,\s*(\d+))?/g.exec(lines.shift()) || [];

        return {
            branch: branch[1],
            commit: branch[2],
            summary: {
                changes: (typeof summary[1] !== 'undefined') ? summary[1] : 0,
                insertions: (typeof summary[2] !== 'undefined') ? summary[2] : 0,
                deletions: (typeof summary[3] !== 'undefined') ? summary[3] : 0
            }
        };
    };

    Git.prototype._parseCheckout = function (checkout) {
        // TODO
    };

    Git.prototype._parseFetch = function (fetch) {
        return fetch;
    };

    Git.prototype._parseListLog = function (logs) {
        var logList = logs.split('\n').map(function (item) {
            var parts = item.split(';');

            return {
                hash: parts[0],
                date: parts[1],
                message: parts[2],
                author_name: parts[3],
                author_email: parts[4]
            }
        });

        return {
            latest: logList.length && logList[logList.length - 1],
            total: logList.length,
            all: logList
        };
    };

    /**
     * Schedules the supplied command to be run, the command should not include the name of the git binary and should
     * either be a string, or an array where the first argument is a formatted string accepted by `format` in the util
     * module that uses the other entities in the array as the template data.
     *
     * @param {string|string[]} command
     * @param {Function} [then]
     * @see http://nodejs.org/api/util.html#util_util_format_format
     * @returns {Git}
     */
    Git.prototype._run = function (command, then) {
        if (typeof command === "string") {
            command = command.split(" ");
        }
        this._runCache.push([command, then]);
        this._schedule();

        return this;
    };

    Git.prototype._schedule = function () {
        if (!this._childProcess && this._runCache.length) {
            var Buffer = this.Buffer;
            var task = this._runCache.shift();
            var command = task[0];
            var then = task[1];

            var stdOut = [];
            var stdErr = [];
            var spawned = this.ChildProcess.spawn(this._command, command.slice(0), {
                cwd: this._baseDir
            });

            spawned.stdout.on('data', function (buffer) { stdOut.push(buffer); });
            spawned.stderr.on('data', function (buffer) { stdErr.push(buffer); });

            spawned.on('close', function (exitCode, exitSignal) {
                delete this._childProcess;

                if (exitCode && stdErr.length) {
                    stdErr = Buffer.concat(stdErr).toString('utf-8');

                    this._getLog('error', stdErr);
                    this._runCache = [];
                    then.call(this, stdErr, null);
                }
                else {
                    then.call(this, null, stdOut.toString('utf-8'));
                }

                process.nextTick(this._schedule.bind(this));
            }.bind(this));

            this._childProcess = spawned;

            if (this._outputHandler) {
                this._outputHandler(command[0],
                    this._childProcess.stdout,
                    this._childProcess.stderr);
            }
        }
    };

    module.exports = Git;

}());
