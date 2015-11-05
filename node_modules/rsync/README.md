# Rsync

`Rsync` is a class for building and executing `rsync` commands with Node.js.

## Installation

Installation goes through NPM:

```
$ npm install rsync
```

## License

This module is licensed under the MIT License. See the `LICENSE` file for more details.

## Simple usage

```javascript
var Rsync = require('rsync');

// Build the command
var rsync = new Rsync()
  .shell('ssh')
  .flags('az')
  .source('/path/to/source')
  .destination('server:/path/to/destination');

// Execute the command
rsync.execute(function(error, code, cmd) {
    // we're done
});
```

For more examples see the `examples` directory.

# API

  * [constructor](#constructor)
  * [instance methods](#instance-methods)
  * [accessor methods](#accessor-methods)
  * [static methods](#static-methods)

## constructor

Construct a new Rsync command instance. The constructor takes no arguments.

```javascript
var rsync = new Rsync();
```

## instance methods

### set(option, value)

Set an option. This can be any option from the rsync manual. The value is optional and only applies to options that take a value. This is not checked however. Supplying a value for an option that does not take a value will append the value regardless. This may cause errors when the command is executed.

```javascript
rsync.set('a')
  .set('progress')
  .set('list-only')
  .set('exclude-from', '/path/to/exclude-file');
```

Options must be unique and setting the same option twice will override any existing value. For options that can be set multiple times special methods exist (see accessor methods). Any leading dashes (-) are stripped when setting the option.

The `set` method is chainable.

### unset(option)

Unset an option. Any leading dashes (-) are stripped when unsetting an option.

```javascript
rsync.unset('progress')
  .unset('quiet');
```

The `unset` method is chainable.

### flags(flags, set)

Set one or more flags. Flags are single letter options without a value, for example _compress_ (`-z`) or _archive_ (`-a`).

The `flags` method is a polymorphic function: it can take different arguments to set flags.
Flags can be presented as a single string with multiple flags, multiple strings as arguments, an array containing strings or an object with the flags as keys.

Whether the presented flags need to be set or unset is determined based on the last argument, if this is a Boolean. When presenting the flags as an Object the value for each key (flag) determines if the flag is set or unset. This version can be used to mix setting and unsetting of flags in one statement.

```javascript
// As String
rsync.flags('avz');        // set
rsync.flags('avz', false); // unset

// As String arguments
rsync.flags('a', 'v', 'z');        // set
rsync.flags('a', 'v', 'z', false); // unset

// As Array
rsync.flags(['a', 'v', 'z']);   // set
rsync.flags(['a', 'z'], false); // unset

// As Object
rsync.flags({
  'a': true, // set
  'z': true, // set
  'v': false // unset
});
```

The `flags` method is chainable.

### isSet(option)

Check if an option is set.

This method does not check alternate versions for an option. When an option is set as the short version this method will still return `false` when checking for the long version, event though they are the same option.

```javascript
rsync.set('quiet');
rsync.isSet('quiet'); // is TRUE
rsync.isSet('q');     // is FALSE
```

### option(option)

Get the value for an option by name. If a valueless option is requested null will be returned.

```javascript
rsync.option('rsh');      // returns String value
rsync.option('progress'); // returns NULL
```

### args()

Get the arguments list for the command that is going to be executed. Returns an Array with the complete options that will be passed to the command.

### command()

Get the complete command that is going to be executed.

```javascript
var rsync = new Rsync()
  .shell('ssh')
  .flags('az')
  .source('/p/t/source')
  .destination('server:/p/t/dest');

var c = rsync.command();
// c is "rsync -az --rsh="ssh" /p/t/source server:/p/t/dest
```

### output(stdoutHandler, stderrHandler)

Register output handler functions for the commands stdout and stderr output. The handlers will be
called with streaming data from the commands output when it is executed.

```javascript
rsync.output(
    function(data){
        // do things like parse progress
    }, function(data) {
        // do things like parse error output
    }
);
```

This method can be called with an array containing one or two functions. These functions will
be treated as the stdoutHandler and stderrHandler arguments. This makes it possible to register
handlers through the `Rsync.build` method by specifying the functions as an array.

```javascript
var rsync = Rsync.build({
    // ...
    output: [stdoutFunc, stderrFunc] // these are references to functions defined elsewhere
    // ...
});
```

### execute(callback, stdoutHandler, stderrHandler)

Execute the command. The callback function is called with an Error object (or null when there
was none), the exit code from the executed command and the executed command as a String.

When `stdoutHandler` and `stderrHandler` functions are provided they will be used to stream
data from stdout and stderr directly without buffering. Any output handlers that were
defined previously will be overwritten.

The function returns the child process object, which can be used to kill the 
rsync process or clean up if the main program exits early.

```javascript
// signal handler function
var quitting = function() {
  if (rsyncPid) {
    rsyncPid.kill();
  }
  process.exit();
}
process.on("SIGINT", quitting); // run signal handler on CTRL-C
process.on("SIGTERM", quitting); // run signal handler on SIGTERM
process.on("exit", quitting); // run signal handler when main process exits

// simple execute
var rsyncPid = rsync.execute(function(error, code, cmd) {
    // we're done
});

// execute with stream callbacks
var rsyncPid = rsync.execute(
    function(error, code, cmd) {
        // we're done
    }, function(data){
        // do things like parse progress
    }, function(data) {
        // do things like parse error output
    }
);
```

## option shorthands

The following option shorthand methods are available:

  - **shell(value)**: `--rsh=SHELL`
  - **delete()**: `--delete`
  - **progress()**: `--progress`
  - **archive()**: `-a`
  - **compress()**: `-z`
  - **recursive()**: `-r`
  - **update()**: `-u`
  - **quiet()**: `-q`
  - **dirs()**: `-d`
  - **links()**: `-l`
  - **dry()**: `-n`

All shorthand methods are chainable as long as options that require a value are provided with one.

## accessor methods

These methods can be used to get or set values in a chainable way. When the methods are called without arguments the current value is returned. When the methods are called with a value this will override the current value and the Rsync instance is returned to provide the chainability.

### executable(executable)

Get or set the executable to use as the rsync command.

### executableShell(shell)

Get or set the shell to use to launch the rsync command on non-Windows (Unix and Mac OS X) systems.  The default shell is /bin/sh.  

On some systems (Debian, for example) /bin/sh links to /bin/dash, which does not do proper process control.  If you have problems with leftover processes, try a different shell such as /bin/bash.

### destination(destination)

Get or set the destination for the rsync command.

### source(source)

Get or set the source or sources for the rsync command. When this method is called multiple times with a value it is appended to the list of sources. It is also possible to present the list of source as an array where each value will be appended to the list of sources

```javascript
// chained
rsync.source('/a/path')
  .source('/b/path');

// as Array
rsync.source(['/a/path', '/b/path']);
```

In both cases the list of sources will contain two paths.

### patterns(patterns)

Register a list of file patterns to include/exclude in the transfer. Patterns can be registered as
an array of Strings or Objects.

When registering a pattern as a String it be prefixed with a `+` or `-` sign to
signal include or exclude for the pattern. The sign will be stripped of and the
pattern will be added to the ordered pattern list.

When registering the pattern as an Object it must contain the `action` and
`pattern` keys where `action` contains the `+` or `-` sign and the `pattern`
key contains the file pattern, without the `+` or `-` sign.

The order of patterns is important for some rsync commands. The patterns are stored in the order
they are added either through the `patterns` method or the `include` and `exclude` methods. The
`patterns` method can be used with `Rsync.build` to provide an ordered list for the command.

```javascript
// on an existing Rsync object
rsync.patterns([ '-.git', { action: '+', pattern: '/some_dir' });

// through Rsync.build
var command = Rsync.build({
    // ...
    patterns: [ '-.git', { action: '+', pattern: '/some_dir' } ]
    // ...
});
```
### exclude(pattern)

Exclude a pattern from transfer. When this method is called multiple times with a value it is
appended to the list of patterns. It is also possible to present the list of excluded
patterns as an array where each pattern will be appended to the list.

```javascript
// chained
rsync.exclude('.git')
  .exclude('.DS_Store');

// as Array
rsync.exclude(['.git', '.DS_Store']);
```

### include(pattern)

Include a pattern for transfer. When this method is called multiple times with a value it is
appended to the list of patterns. It is also possible to present the list of included patterns as
an array where each pattern will be appended to the list.

```javascript
// chained
rsync.include('/a/file')
  .include('/b/file');

// as Array
rsync.include(['/a/file', '/b/file']);
```

### debug(flag)

Get or set the debug flag. This is only used internally and must be a Boolean to set or unset.

## static methods

### build

For convenience there is the `build` function on the Rsync contructor. This function can be
used to create a new Rsync command instance from an options object.

For each key in the options object the corresponding method on the Rsync instance will be
called. When a function for the key does not exist it is ignored. An existing Rsync instance
can optionally be provided.

```javascript
var rsync = Rsync.build({
  source:      '/path/to/source',
  destination: 'server:/path/to/destination',
  exclude:     ['.git'],
  flags:       'avz',
  shell:       'ssh'
});

rsync.execute(function(error, stdout, stderr) {
  // we're done
});
```

# Development

If there is something missing (which there probably is) just fork, patch and send a pull request.

For adding a new shorthand method there are a few simple steps to take:
- Fork
- Add the option through the `exposeShortOption` or `exposeLongOption` functions. For examples see the source file.
- Update this README file to list the new shorthand method
- Make a pull request

When adding a shorthand make sure it does not already exist, it is a sane name and a shorthand is necessary.

If there is something broken (which there probably is), the same applies: fork, patch, pull request. Opening an issue is also possible.

# Changelog

v0.4.0

  - Child process pid is returned from `execute` (#27)
  - Command execution shell is configurable for Unix systems (#27)
  - Better escaping for filenames with spaces (#24)

v0.3.0

  - Launch the command under a shell (#15)
  - Typo fix isaArray -> isArray for issue (#14)
  - Error: rsync exited with code 14 (#11)

v0.2.0

  - use spawn instead of exec (#6)

v0.1.0

  - better support for include/exclude filters
  - better support for output handlers
  - removed output buffering (#6)

v0.0.2

  - swapped exclude and include order
  - better shell escaping

v0.0.1

  - initial version (actually the second)
