var spawn = require('child_process').spawn;

/**
 * Rsync is a wrapper class to configure and execute an `rsync` command
 * in a fluent and convenient way.
 *
 * A new command can be set up by creating a new `Rsync` instance of
 * obtaining one through the `build` method.
 *
 * @example
 *   // using the constructor
 *   var rsync = new Rsync()
 *       .source('/path/to/source')
 *       .destination('myserver:destination/');
 *
 *   // using the build method with options
 *   var rsync = Rsync.build({
 *     source:      '/path/to/source',
 *     destination: 'myserver:destination/'
 *   });
 *
 * Executing the command can be done using the `execute` method. The command
 * is executed as a child process and three callbacks can be registered. See
 * the `execute` method for more details.
 *
 * @example
 *   rsync.execute(function(error, code, cmd) {
 *     // function called when the child process is finished
 *   }, function(stdoutChunk) {
 *     // function called when a chunk of text is received on stdout
 *   }, function stderrChunk) {
 *     // function called when a chunk of text is received on stderr
 *   });
 *
 * @author      Mattijs Hoitink <mattijs@monkeyandmachine.com>
 * @copyright   Copyright (c) 2013, Mattijs Hoitink <mattijs@monkeyandmachine.com>
 * @license     The MIT License
 *
 * @constructor
 * @param {Object} config Configuration settings for the Rsync wrapper.
 */
function Rsync(config) {
    if (!(this instanceof Rsync)) {
        return new Rsync(config);
    }

    // Parse config
    config = config || {};
    if (typeof(config) !== 'object') {
        throw new Error('Rsync config must be an Object');
    }

    // executable
    this._executable = hasOP(config, 'executable') ? config.executable : 'rsync';

    // shell
    this._executableShell = hasOP(config, 'executableShell') ? config.executableShell : '/bin/sh';

    // source(s) and destination
    this._sources     = [];
    this._destination = '';

    // ordered list of file patterns to include/exclude
    this._patterns = [];

    // options
    this._options = {};

    // output callbacks
    this._outputHandlers = {
        stdout: null,
        stderr: null
    };

    // Debug parameter
    this._debug = hasOP(config, 'debug') ? config.debug : false;
}

/**
 * Build a new Rsync command from an options Object.
 * @param {Object} options
 * @return {Rsync}
 */
Rsync.build = function(options) {
    var command = new Rsync();

    // Process all options
    for (var key in options) {
        if (hasOP(options, key)) {
            var value = options[key];

            // Only allow calling methods on the Rsync command
            if (typeof(command[key]) === 'function') {
                command[key](value);
            }
        }
    }

    return command;
};

/**
 * Set an option.
 * @param {String} option
 * @param mixed value
 * @return Rsync
 */
Rsync.prototype.set = function(option, value) {
    option = stripLeadingDashes(option);
    if (option && option.length > 0) {
        this._options[option] = value || null;
    }
    return this;
};

/**
 * Unset an option.
 * @param {String} option
 * @return Rsync
 */
Rsync.prototype.unset = function(option) {
    option = stripLeadingDashes(option);

    if (option && Object.keys(this._options).indexOf(option) >= 0) {
        delete this._options[option];
    }
    return this;
};

/**
 * Set or unset one or more flags. A flag is a single letter option without a value.
 *
 * Flags can be presented as a single String, an Array containing Strings or an Object
 * with the flags as keys.
 *
 * When flags are presented as a String or Array the set or unset method will be determined
 * by the second parameter.
 * When the flags are presented as an Object the set or unset method will be determined by
 * the value corresponding to each flag key.
 *
 * @param {String|Array|Object} flags
 * @param {Boolean} set
 * @return Rsync
 */
Rsync.prototype.flags = function(flags, set) {
    // Do some argument handling
    if (!arguments.length) {
        return this;
    }
    else if (arguments.length === 1) {
        set = true;
    }
    else {
        // There are more than 1 arguments, assume flags are presented as strings
        flags = Array.prototype.slice.call(arguments);

        // Check if the last argument is a boolean
        if (typeof(flags[flags.length - 1]) === 'boolean') {
            set = flags.pop();
        }
        else {
            set = true;
        }
    }

    // Split multiple flags
    if (typeof(flags) === 'string') {
        flags = stripLeadingDashes(flags).split('');
    }

    // Turn array into an object
    if (isArray(flags)) {
        var obj = {};
        flags.forEach(function(f) {
            obj[f] = set;
        });
        flags = obj;
    }

    // set/unset each flag
    for (var key in flags) {
        if (hasOP(flags, key)) {
            var method = (flags[key]) ? 'set' : 'unset';
            this[method](stripLeadingDashes(key));
        }
    }

    return this;
};

/**
 * Check if an option is set.
 * @param {String} option
 * @return {Boolean}
 */
Rsync.prototype.isSet = function(option) {
    option = stripLeadingDashes(option);
    return Object.keys(this._options).indexOf(option) >= 0;
};

/**
 * Get an option by name.
 * @param {String} name
 * @return mixed
 */
Rsync.prototype.option = function(name) {
    return this._options[name];
};

/**
 * Register a list of file patterns to include/exclude in the transfer. Patterns can be
 * registered as an array of Strings or Objects.
 *
 * When registering a pattern as a String it must be prefixed with a `+` or `-` sign to
 * signal include or exclude for the pattern. The sign will be stripped of and the
 * pattern will be added to the ordered pattern list.
 *
 * When registering the pattern as an Object it must contain the `action` and
 * `pattern` keys where `action` contains the `+` or `-` sign and the `pattern`
 * key contains the file pattern, without the `+` or `-` sign.
 *
 * @example
 *   // on an existing rsync object
 *   rsync.patterns(['-docs', { action: '+', pattern: '/subdir/*.py' }]);
 *
 *   // using Rsync.build for a new rsync object
 *   rsync = Rsync.build({
 *     ...
 *     patterns: [ '-docs', { action: '+', pattern: '/subdior/*.py' }]
 *     ...
 *   })
 *
 * @param {Array} patterns
 * @return Rsync
 */
Rsync.prototype.patterns = function(patterns) {
    if (arguments.length > 1) {
        patterns = Array.prototype.slice.call(arguments, 0);
    }
    if (!isArray(patterns)) {
        patterns = [ patterns ];
    }

    patterns.forEach(function(pattern) {
        var action = '?';
        if (typeof(pattern) === 'string') {
            action  = pattern.charAt(0);
            pattern = pattern.substring(1);
        }
        else if (
            typeof(pattern) === 'object' &&
            hasOP(pattern, 'action') &&
            hasOP(pattern, 'pattern')
        ) {
            action  = pattern.action;
            pattern = pattern.pattern;
        }

        // Check if the pattern is an include or exclude
        if (action === '-') {
            this.exclude(pattern);
        }
        else if (action === '+') {
            this.include(pattern);
        }
        else {
            throw new Error('Invalid pattern');
        }
    }, this);
};

/**
 * Exclude a file pattern from transfer. The pattern will be appended to the ordered list
 * of patterns for the rsync command.
 *
 * @param {String|Array} patterns
 * @return Rsync
 */
Rsync.prototype.exclude = function(patterns) {
    if (arguments.length > 1) {
        patterns = Array.prototype.slice.call(arguments, 0);
    }
    if (!isArray(patterns)) {
        patterns = [ patterns ];
    }

    patterns.forEach(function(pattern) {
        this._patterns.push({ action:  '-', pattern: pattern });
    }, this);

    return this;
};

/**
 * Include a file pattern for transfer. The pattern will be appended to the ordered list
 * of patterns for the rsync command.
 *
 * @param {String|Array} patterns
 * @return Rsync
 */
Rsync.prototype.include = function(patterns) {
    if (arguments.length > 1) {
        patterns = Array.prototype.slice.call(arguments, 0);
    }
    if (!isArray(patterns)) {
        patterns = [ patterns ];
    }

    patterns.forEach(function(pattern) {
        this._patterns.push({ action:  '+', pattern: pattern });
    }, this);

    return this;
};

/**
 * Get the command that is going to be executed.
 * @return {String}
 */
Rsync.prototype.command = function() {
    return this.executable() + ' ' + this.args().join(' ');
};

/**
 * String representation of the Rsync command. This is the command that is
 * going to be executed when calling Rsync::execute.
 * @return {String}
 */
Rsync.prototype.toString = Rsync.prototype.command;

/**
 * Get the arguments for the rsync command.
 * @return {Array}
 */
Rsync.prototype.args = function() {
    // Gathered arguments
    var args = [];

    // Add options. Short options (one letter) without values are gathered together.
    // Long options have a value but can also be a single letter.
    var short = [];
    var long  = [];

    // Split long and short options
    for (var key in this._options) {
        if (hasOP(this._options, key)) {
            var value = this._options[key];
            var noval = (value === null || value === undefined);

            // Check for short option (single letter without value)
            if (key.length === 1 && noval) {
                short.push(key);
            }
            else {
                long.push(buildOption(key, value));
            }

        }
    }

    // Add combined short options if any are present
    if (short.length > 0) {
        args.push('-' + short.join(''));
    }

    // Add long options if any are present
    if (long.length > 0) {
        args = args.concat(long);
    }

    // Add includes/excludes in order
    this._patterns.forEach(function(def) {
        if (def.action === '-') {
            args.push(buildOption('exclude', def.pattern));
        }
        else if (def.action === '+') {
            args.push(buildOption('include', def.pattern));
        }
        else {
            debug(this, 'Unknown pattern action ' + def.action);
        }
    });

    // Add sources
    if (this.source().length > 0) {
        args = args.concat(this.source().map(escapeShellArg));
    }

    // Add destination
    if (this.destination()) {
        args.push(escapeShellArg(this.destination()));
    }

    return args;
};

/**
 * Register an output handlers for the commands stdout and stderr streams.
 * These functions will be called once data is streamed on one of the output buffers
 * when the command is executed using `execute`.
 *
 * Only one callback function can be registered for each output stream. Previously
 * registered callbacks will be overridden.
 *
 * @param {Function} stdout     Callback Function for stdout data
 * @param {Function} stderr     Callback Function for stderr data
 * @return Rsync
 */
Rsync.prototype.output = function(stdout, stderr) {
    // Check for single argument so the method can be used with Rsync.build
    if (arguments.length === 1 && Array.isArray(stdout)) {
        stderr = stdout[1];
        stdout = stdout[0];
    }

    if (typeof(stdout) === 'function') {
        this._outputHandlers.stdout = stdout;
    }
    if (typeof(stderr) === 'function') {
        this._outputHandlers.stderr = stdout;
    }

    return this;
};

/**
 * Execute the rsync command.
 *
 * The callback function is called with an Error object (or null when there was none),
 * the exit code from the executed command and the executed command as a String.
 *
 * When stdoutHandler and stderrHandler functions are provided they will be used to stream
 * data from stdout and stderr directly without buffering.
 *
 * @param {Function} callback       Called when rsync finishes (optional)
 * @param {Function} stdoutHandler  Called on each chunk received from stdout (optional)
 * @param {Function} stderrHandler  Called on each chunk received from stderr (optional)
 */
Rsync.prototype.execute = function(callback, stdoutHandler, stderrHandler) {
    // Register output handlers
    this.output(stdoutHandler, stderrHandler);

    // Execute the command as a child process
    // see https://github.com/joyent/node/blob/937e2e351b2450cf1e9c4d8b3e1a4e2a2def58bb/lib/child_process.js#L589
    var cmdProc;
    if ('win32' === process.platform) {
        cmdProc = spawn('cmd.exe', ['/s', '/c', '"' + this.command() + '"'],
                        { stdio: 'pipe', windowsVerbatimArguments: true });
    }
    else {
        cmdProc = spawn(this._executableShell, ['-c', this.command()],
                        { stdio: 'pipe' });
    }

    // Capture stdout and stderr if there are output handlers configured
    if (typeof(this._outputHandlers.stdout) === 'function') {
        cmdProc.stdout.on('data', this._outputHandlers.stdout);
    }
    if (typeof(this._outputHandlers.stderr) === 'function') {
        cmdProc.stderr.on('data', this._outputHandlers.stderr);
    }

    // Wait for the command to finish
    cmdProc.on('close', function(code) {
        var error = null;

        // Check rsyncs error code
        // @see http://bluebones.net/2007/06/rsync-exit-codes/
        if (code !== 0) {
            error = new Error('rsync exited with code ' + code);
        }

        // Check for callback
        if (typeof(callback) === 'function') {
            callback(error, code, this.command());
        }
    }.bind(this));

    // Return the child process object so it can be cleaned up
    // if the process exits
    return(cmdProc);
};

/**
 * Get or set the debug property.
 *
 * The property is set to the boolean provided so unsetting the debug
 * property has to be done by passing false to this method.
 *
 * @function
 * @name debug
 * @memberOf Rsync.prototype
 * @param {Boolean} debug the value of the debug property (optional)
 * @return {Rsync|Boolean}
 */
createValueAccessor('debug');

/**
 * Get or set the executable to use for the rsync process.
 *
 * When setting the executable path the Rsync instance is returned for
 * the fluent interface. Otherwise the configured executable path
 * is returned.
 *
 * @function
 * @name executable
 * @memberOf Rsync.prototype
 * @param {String} executable path to the executable (optional)
 * @return {Rsync|String}
 */
createValueAccessor('executable');

/**
 * Get or set the shell to use on non-Windows (Unix or Mac OS X) systems.
 *
 * When setting the shell the Rsync instance is returned for the 
 * fluent interface. Otherwise the configured shell is returned.
 *
 * @function
 * @name executableShell
 * @memberOf Rsync.prototype
 * @param {String} shell to use on non-Windows systems (optional)
 * @return {Rsync|String}
 */
createValueAccessor('executableShell');

/**
 * Get or set the destination for the transfer.
 *
 * When setting the destination the Rsync instance is returned for
 * the fluent interface. Otherwise the configured destination path
 * is returned.
 *
 * @function
 * @name destination
 * @memberOf Rsync.prototype
 * @param {String} destination the destination (optional)
 * @return {Rsync|String}
 */
createValueAccessor('destination');

/**
 * Add one or more sources for the command or get the list of configured
 * sources.
 *
 * The sources are appended to the list of known sources if they were not
 * included yet and the Rsync instance is returned for the fluent
 * interface. Otherwise the configured list of source is returned.
 *
 * @function
 * @name source
 * @memberOf Rsync.prototype
 * @param {String|Array} sources the source or list of sources to configure (optional)
 * @return {Rsync|Array}
 */
createListAccessor('source', '_sources');

/**
 * Set the shell to use when logging in on a remote server.
 *
 * This is the same as setting the `rsh` option.
 *
 * @function
 * @name shell
 * @memberOf Rsync.prototype
 * @param {String} shell the shell option to use
 * @return {Rsync}
 */
exposeLongOption('rsh', 'shell');

/**
 * Set the delete flag.
 *
 * This is the same as setting the `--delete` commandline flag.
 *
 * @function
 * @name delete
 * @memberOf Rsync.prototype
 * @return {Rsync}
 */
exposeShortOption('delete');

/**
 * Set the progress flag.
 *
 * This is the same as setting the `--progress` commandline flag.
 *
 * @function
 * @name progress
 * @memberOf Rsync.prototype
 * @return {Rsync}
 */
exposeShortOption('progress');

/**
 * Set the archive flag.
 *
 * @function
 * @name archive
 * @memberOf Rsync.prototype
 * @return {Rsync}
 */
exposeShortOption('a', 'archive');

/**
 * Set the compress flag.
 *
 * @function
 * @name compress
 * @memberOf Rsync.prototype
 * @return {Rsync}
 */
exposeShortOption('z', 'compress');

/**
 * Set the recursive flag.
 *
 * @function
 * @name recursive
 * @memberOf Rsync.prototype
 * @return {Rsync}
 */
exposeShortOption('r', 'recursive');

/**
 * Set the update flag.
 *
 * @function
 * @name update
 * @memberOf Rsync.prototype
 * @return {Rsync}
 */
exposeShortOption('u', 'update');

/**
 * Set the quiet flag.
 *
 * @function
 * @name quiet
 * @memberOf Rsync.prototype
 * @return {Rsync}
 */
exposeShortOption('q', 'quiet');

/**
 * Set the dirs flag.
 *
 * @function
 * @name dirs
 * @memberOf Rsync.prototype
 * @return {Rsync}
 */
exposeShortOption('d', 'dirs');

/**
 * Set the links flag.
 *
 * @function
 * @name links
 * @memberOf Rsync.prototype
 * @return {Rsync}
 */
exposeShortOption('l', 'links');

/**
 * Set the dry flag.
 *
 * @function
 * @name dry
 * @memberOf Rsync.prototype
 * @return {Rsync}
 */
exposeShortOption('n', 'dry');

// our awesome export product
module.exports = Rsync;

/* **** */

/**
 * Create a chainable function on the Rsync prototype for getting and setting an
 * internal value.
 * @param {String} name
 * @param {String} internal
 */
function createValueAccessor(name, internal) {
    var container = internal || '_' + name;

    Rsync.prototype[name] = function(value) {
        if (!arguments.length) return this[container];
        this[container] = value;
        return this;
    };
}

/**
 * @param {String} name
 * @param {String} internal
 */
function createListAccessor(name, internal) {
    var container = internal || '_' + name;

    Rsync.prototype[name] = function(value) {
        if (!arguments.length) return this[container];

        if (isArray(value)) {
            value.forEach(this[name], this);
        }
        else if (typeof(value) !== 'string') {
            throw new Error('Value for Rsync::' + name + ' must be a String');
        }
        else if (this[container].indexOf(value) < 0) {
            this[container].push(value);
        }

        return this;
    };
}

/**
 * Create a shorthand method on the Rsync prototype for setting and unsetting a simple option.
 * @param {String} option
 * @param {String} name
 */
function exposeShortOption(option, name) {
    name = name || option;

    Rsync.prototype[name] = function(set) {
        // When no arguments are passed in assume the option
        // needs to be set
        if (!arguments.length) set = true;

        var method = (set) ? 'set' : 'unset';
        return this[method](option);
    };
}

/**
 * Expose an rsync long option on the Rsync prototype.
 * @param {String} option   The option to expose
 * @param {String} name     An optional alternative name for the option.
 */
function exposeLongOption(option, name) {
    name = name || option;

    Rsync.prototype[name] = function(value) {
        // When not arguments are passed in assume the options
        // current value is requested
        if (!arguments.length) return this.option(option);

        var method = (value) ? 'set' : 'unset';
        return this[method](option, value);
    };
}

/**
 * Build an option for use in a shell command.
 * @param {String} name
 * @param {String} value
 * @return {String}
 */
function buildOption(name, value) {
    // Detect single option key
    var single = (name.length === 1) ? true : false;

    // Decide on prefix and value glue
    var prefix = (single) ? '-' : '--';
    var glue   = (single) ? ' ' : '=';

    // Build the option
    var option = prefix + name;
    if (arguments.length > 1 && value) {
        value   = escapeShellArg(String(value));
        option += glue + value;
    }

    return option;
}

/**
 * Escape an argument for use in a shell command when necessary.
 * @param {String} arg
 * @return {String}
 */
function escapeShellArg(arg) {
  if (!/(["'`\\$ ])/.test(arg)) {
    return arg;
  }
  return '"' + arg.replace(/(["'`\\$])/g, '\\$1') + '"';
}

/**
 * Escape a filename for use in a shell command.
 * @param {String} filename the filename to escape
 * @return {String} the escaped version of the filename
 */
function escapeFilename(filename) {
  return filename.replace(/(["'`\s\\])/g,'\\$1');
}

/**
 * Strip the leading dashes from a value.
 * @param {String} value
 * @return {String}
 */
function stripLeadingDashes(value) {
    if (typeof(value) === 'string') {
        value = value.replace(/^[\-]*/, '');
    }

    return value;
}

/**
 * Simple function for checking if a value is an Array. Will use the native
 * Array.isArray method if available.
 * @private
 * @param {Mixed} value
 * @return {Boolean}
 */
function isArray(value) {
    if (typeof(Array.isArray) === 'function') {
        return Array.isArray(value);
    }
    else {
        return toString.call(value) == '[object Array]';
    }
}

/**
 * Simple hasOwnProperty wrapper. This will call hasOwnProperty on the obj
 * through the Object prototype.
 * @private
 * @param {Object} obj  The object to check the property on
 * @param {String} key  The name of the property to check
 * @return {Boolean}
 */
function hasOP(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Simple debug printer.
 *
 * @private
 * @param {Rsync} cmd
 * @param {String} message
 */
function debug(cmd, message) {
    if (!cmd._debug) return;
}
